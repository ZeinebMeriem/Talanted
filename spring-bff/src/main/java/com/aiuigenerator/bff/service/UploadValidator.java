package com.aiuigenerator.bff.service;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UploadValidator {

    private final long maxBytes;
    private final List<String> allowedMime;

    public UploadValidator(
            @Value("${app.upload.max-bytes}") long maxBytes,
            @Value("${app.upload.allowed-mime}") List<String> allowedMime) {
        this.maxBytes = maxBytes;
        this.allowedMime = allowedMime;
    }

    public void validatePrompt(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new IllegalArgumentException("prompt must not be blank");
        }
    }

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return;
        }

        String mime = file.getContentType();
        if (mime == null || !allowedMime.contains(mime)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Unsupported MIME type: " + mime);
        }

        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "File too large: " + file.getOriginalFilename());
        }
    }

    public String sanitizeFilename(String name) {
        if (name == null) {
            return "file";
        }
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public void validateBytes(String mimeType, long sizeBytes, String originalName) {
        if (mimeType == null || !allowedMime.contains(mimeType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Unsupported MIME type: " + mimeType);
        }
        if (sizeBytes > maxBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "File too large: " + (originalName == null ? "file" : originalName));
        }
    }

    public String computeSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Unable to compute sha256", e);
        }
    }

    public String computeSha256(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            return computeSha256(bytes);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to compute sha256", e);
        }
    }
}
