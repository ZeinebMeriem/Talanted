package com.aiuigenerator.bff.web;

import java.io.IOException;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Logs incoming requests and outgoing responses with duration.
 * Helps with API monitoring and debugging.
 */
@Component
public class RequestResponseLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestResponseLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Skip logging for health checks
        if (isHealthCheck(httpRequest)) {
            chain.doFilter(request, response);
            return;
        }

        String method = httpRequest.getMethod();
        String path = httpRequest.getRequestURI();
        String queryString = httpRequest.getQueryString();
        long startTime = System.currentTimeMillis();

        // Log incoming request
        logger.info("→ {} {} (query: {})", method, path, queryString != null ? queryString : "n/a");

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = httpResponse.getStatus();

            // Log response with duration
            String statusCategory = status < 400 ? "✓" : (status < 500 ? "⚠" : "✗");
            logger.info("← {} {} [{}ms] status={}",
                    statusCategory, method, path, duration, status);
        }
    }

    private boolean isHealthCheck(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.contains("/health") || path.contains("/actuator");
    }
}
