package com.aiuigenerator.bff.web;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stripe")
public class StripeController {

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isBlank()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<Map<String, String>> createCheckoutSession(
            @RequestBody Map<String, String> body) {

        String priceId     = body.get("priceId");
        String successUrl  = body.getOrDefault("successUrl", "http://localhost:5173/?upgrade=success");
        String cancelUrl   = body.getOrDefault("cancelUrl",  "http://localhost:5173/");

        if (priceId == null || priceId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "priceId is required"));
        }
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "Stripe not configured"));
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setSuccessUrl(successUrl + "&session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
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
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    /** Called by Stripe webhook after payment — sets plan on user (stub: logs only). */
    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        // TODO: verify webhook signature with STRIPE_WEBHOOK_SECRET and update user plan in DB
        return ResponseEntity.ok("received");
    }
}
