package com.aiuigenerator.bff.service;

import java.io.IOException;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class FileStorageService {

    private final S3Client s3;
    private final String bucket;

    public FileStorageService(S3Client s3, @Value("${app.minio.bucket}") String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    public String putToMinio(String objectKey, MultipartFile file) {
        try {
            String originalName = file.getOriginalFilename();
            String contentType = normalizeContentType(file.getContentType(), originalName);

            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(contentType)
                    .contentDisposition(buildInlineContentDisposition(originalName))
                    .build();

            s3.putObject(req, RequestBody.fromBytes(file.getBytes()));
            return objectKey;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to upload to MinIO", e);
        }
    }

    public String putBytesToMinio(String objectKey, byte[] bytes, String mimeType, String originalName) {
        String contentType = normalizeContentType(mimeType, originalName);

        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .contentDisposition(buildInlineContentDisposition(originalName))
                .build();

        s3.putObject(req, RequestBody.fromBytes(bytes));
        return objectKey;
    }

    private static String normalizeContentType(String provided, String originalName) {
        String ct = (provided == null ? "" : provided.trim()).toLowerCase(Locale.ROOT);
        if (ct.isEmpty() || ct.equals("application/octet-stream")) {
            String guessed = guessContentTypeFromName(originalName);
            return guessed != null ? guessed : "application/octet-stream";
        }
        return ct;
    }

    private static String buildInlineContentDisposition(String originalName) {
        String fallback = "file";
        String safe = (originalName == null ? "" : originalName).trim();
        if (safe.isEmpty()) {
            safe = fallback;
        }
        // Minimal header-safety: remove CR/LF and quotes.
        safe = safe.replace("\r", "").replace("\n", "").replace("\"", "'");
        return "inline; filename=\"" + safe + "\"";
    }

    private static String guessContentTypeFromName(String originalName) {
        if (originalName == null)
            return null;
        String name = originalName.toLowerCase(Locale.ROOT);
        if (name.endsWith(".pdf"))
            return "application/pdf";
        if (name.endsWith(".png"))
            return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg"))
            return "image/jpeg";
        if (name.endsWith(".gif"))
            return "image/gif";
        if (name.endsWith(".svg"))
            return "image/svg+xml";
        if (name.endsWith(".webp"))
            return "image/webp";
        if (name.endsWith(".txt"))
            return "text/plain";
        if (name.endsWith(".md"))
            return "text/markdown";
        if (name.endsWith(".json"))
            return "application/json";
        if (name.endsWith(".csv"))
            return "text/csv";
        if (name.endsWith(".html") || name.endsWith(".htm"))
            return "text/html";
        if (name.endsWith(".css"))
            return "text/css";
        if (name.endsWith(".js"))
            return "text/javascript";
        if (name.endsWith(".xml"))
            return "application/xml";
        if (name.endsWith(".yaml") || name.endsWith(".yml"))
            return "application/yaml";
        return null;
    }
}
