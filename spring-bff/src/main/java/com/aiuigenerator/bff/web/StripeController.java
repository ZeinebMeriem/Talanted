package com.aiuigenerator.bff.web;

import com.aiuigenerator.bff.dto.UserProfileDto.UpdatePlanRequest;
import com.aiuigenerator.bff.service.UserProfileService;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.param.checkout.SessionRetrieveParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/stripe")
public class StripeController {

    private static final Logger log = LoggerFactory.getLogger(StripeController.class);

    /** Maps Stripe price IDs → plan names. Keep in sync with frontend plans.ts. */
    private static final Map<String, String> PRICE_TO_PLAN = Map.of(
            "price_1TlbfMFE0aUBf54KlSc6JRai", "team",
            "price_1TlbfMFE0aUBf54KpweXNlqr", "team",
            "price_1TlbheFE0aUBf54KNyXOvMC4", "enterprise",
            "price_1TlbiDFE0aUBf54KNWKf6Pkb", "enterprise"
    );

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    private final UserProfileService userProfileService;

    public StripeController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isBlank()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }

    // ── Create checkout session ───────────────────────────────────────────────

    @PostMapping("/create-checkout-session")
    public ResponseEntity<Map<String, String>> createCheckoutSession(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal JwtAuthenticationToken token) {

        String priceId    = body.get("priceId");
        String successUrl = body.getOrDefault("successUrl", "http://localhost:5173/?upgrade=success");
        String cancelUrl  = body.getOrDefault("cancelUrl",  "http://localhost:5173/#pricing");

        if (priceId == null || priceId.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "priceId is required"));
        if (stripeSecretKey == null || stripeSecretKey.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "Stripe not configured"));

        // Extract userId from JWT to attach as clientReferenceId so we can identify
        // the user after payment (both via verify-session and webhook).
        String userId = "anonymous";
        if (token != null) {
            Object sub = token.getToken().getClaims().get("sub");
            if (sub != null) userId = sub.toString();
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setSuccessUrl(successUrl + "&session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .setClientReferenceId(userId)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setPrice(priceId)
                                    .setQuantity(1L)
                                    .build()
                    )
                    .build();

            Session session = Session.create(params);
            return ResponseEntity.ok(Map.of("url", session.getUrl()));

        } catch (StripeException e) {
            log.error("Stripe checkout error: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Verify session after success redirect ─────────────────────────────────
    // Frontend calls this right after Stripe redirects back with ?session_id=xxx
    // This is the "optimistic" path; the webhook handles the reliable path.

    @PostMapping("/verify-session")
    public ResponseEntity<Map<String, Object>> verifySession(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal JwtAuthenticationToken token) {

        String sessionId = body.get("sessionId");
        if (sessionId == null || sessionId.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "sessionId required"));
        if (stripeSecretKey == null || stripeSecretKey.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "Stripe not configured"));

        try {
            SessionRetrieveParams params = SessionRetrieveParams.builder()
                    .addExpand("subscription")
                    .addExpand("subscription.items.data.price")
                    .build();
            Session session = Session.retrieve(sessionId, params, null);

            if (!"complete".equals(session.getStatus()) && !"paid".equals(session.getPaymentStatus())) {
                return ResponseEntity.ok(Map.of("success", false, "reason", "payment_incomplete"));
            }

            String customerId = session.getCustomer();
            String priceId    = extractPriceId(session);
            String planId     = PRICE_TO_PLAN.getOrDefault(priceId, "team");
            String subId      = session.getSubscription() != null ? session.getSubscription()
                              : session.getSubscriptionObject() != null ? session.getSubscriptionObject().getId() : null;
            Instant periodEnd = extractPeriodEnd(session);

            // Identify user: prefer clientReferenceId from session, fall back to JWT sub
            String userId = session.getClientReferenceId();
            log.info("verify-session debug: clientReferenceId={} token={} priceId={} planId={} status={}",
                    userId, token != null ? "present" : "NULL", priceId, planId, session.getStatus());
            if ((userId == null || userId.isBlank() || "anonymous".equals(userId)) && token != null) {
                Object sub = token.getToken().getClaims().get("sub");
                log.info("verify-session fallback to JWT sub={}", sub);
                if (sub != null) userId = sub.toString();
            }
            log.info("verify-session final userId={}", userId);

            if (userId != null && !userId.isBlank() && !"anonymous".equals(userId)) {
                UpdatePlanRequest req = new UpdatePlanRequest();
                req.planId           = planId;
                req.stripeCustomerId = customerId;
                req.subscriptionId   = subId;
                req.currentPeriodEnd = periodEnd;
                userProfileService.updatePlan(userId, req);
                log.info("Plan updated via verify-session: userId={} plan={}", userId, planId);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "planId",  planId,
                    "customerId", customerId != null ? customerId : ""
            ));

        } catch (StripeException e) {
            log.error("verify-session error: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Stripe webhook ────────────────────────────────────────────────────────

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {

        Event event;
        try {
            if (webhookSecret != null && !webhookSecret.isBlank() && sigHeader != null) {
                event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            } else {
                // No webhook secret configured (dev mode) — skip processing.
                // Use /api/stripe/verify-session instead for dev-mode plan updates.
                log.debug("Webhook received without secret — ignored in dev mode");
                return ResponseEntity.ok("received");
            }
        } catch (SignatureVerificationException e) {
            log.warn("Invalid Stripe webhook signature");
            return ResponseEntity.status(400).body("Invalid signature");
        } catch (Exception e) {
            log.warn("Webhook parse error: {}", e.getMessage());
            return ResponseEntity.status(400).body("Parse error");
        }

        log.info("Stripe webhook: type={}", event.getType());

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event);
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            default -> log.debug("Unhandled webhook event: {}", event.getType());
        }

        return ResponseEntity.ok("received");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void handleCheckoutCompleted(Event event) {
        try {
            var dataObj = event.getDataObjectDeserializer().getObject();
            if (dataObj.isEmpty()) return;
            Session session = (Session) dataObj.get();

            String customerId  = session.getCustomer();
            String userId      = session.getClientReferenceId();
            String subId       = session.getSubscription();
            // Retrieve full session to get price details
            SessionRetrieveParams params = SessionRetrieveParams.builder()
                    .addExpand("subscription.items.data.price").build();
            Session full = Session.retrieve(session.getId(), params, null);
            String priceId = extractPriceId(full);
            String planId  = PRICE_TO_PLAN.getOrDefault(priceId, "team");
            Instant end    = extractPeriodEnd(full);

            if (userId != null && !userId.isBlank() && !"anonymous".equals(userId)) {
                UpdatePlanRequest req = new UpdatePlanRequest();
                req.planId           = planId;
                req.stripeCustomerId = customerId;
                req.subscriptionId   = subId;
                req.currentPeriodEnd = end;
                userProfileService.updatePlan(userId, req);
                log.info("checkout.session.completed: userId={} plan={}", userId, planId);
            } else if (customerId != null) {
                userProfileService.updatePlanByCustomerId(customerId, planId, subId, end);
            }
        } catch (Exception e) {
            log.error("handleCheckoutCompleted error: {}", e.getMessage(), e);
        }
    }

    private void handleSubscriptionUpdated(Event event) {
        try {
            var dataObj = event.getDataObjectDeserializer().getObject();
            if (dataObj.isEmpty()) return;
            Subscription sub = (Subscription) dataObj.get();

            String customerId = sub.getCustomer();
            String priceId    = sub.getItems().getData().isEmpty() ? null
                              : sub.getItems().getData().get(0).getPrice().getId();
            String planId     = PRICE_TO_PLAN.getOrDefault(priceId, "team");
            Instant end       = sub.getCurrentPeriodEnd() != null
                              ? Instant.ofEpochSecond(sub.getCurrentPeriodEnd()) : null;
            String status     = sub.getStatus(); // active, past_due, canceled, etc.

            if ("active".equals(status) || "trialing".equals(status)) {
                userProfileService.updatePlanByCustomerId(customerId, planId, sub.getId(), end);
            } else if ("canceled".equals(status) || "unpaid".equals(status)) {
                userProfileService.updatePlanByCustomerId(customerId, "free", null, null);
            }
        } catch (Exception e) {
            log.error("handleSubscriptionUpdated error: {}", e.getMessage(), e);
        }
    }

    private void handleSubscriptionDeleted(Event event) {
        try {
            var dataObj = event.getDataObjectDeserializer().getObject();
            if (dataObj.isEmpty()) return;
            Subscription sub = (Subscription) dataObj.get();
            userProfileService.updatePlanByCustomerId(sub.getCustomer(), "free", null, null);
            log.info("Subscription deleted, reverted to free: customerId={}", sub.getCustomer());
        } catch (Exception e) {
            log.error("handleSubscriptionDeleted error: {}", e.getMessage(), e);
        }
    }

    private String extractPriceId(Session session) {
        try {
            Subscription sub = session.getSubscriptionObject();
            if (sub != null && !sub.getItems().getData().isEmpty()) {
                return sub.getItems().getData().get(0).getPrice().getId();
            }
        } catch (Exception ignored) {}
        return "";
    }

    private Instant extractPeriodEnd(Session session) {
        try {
            Subscription sub = session.getSubscriptionObject();
            if (sub != null && sub.getCurrentPeriodEnd() != null) {
                return Instant.ofEpochSecond(sub.getCurrentPeriodEnd());
            }
        } catch (Exception ignored) {}
        return null;
    }
}
