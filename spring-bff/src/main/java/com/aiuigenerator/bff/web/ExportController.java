package com.aiuigenerator.bff.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aiuigenerator.bff.dto.CodeBundleDto;
import com.aiuigenerator.bff.dto.CodeFileDto;
import com.aiuigenerator.bff.service.GenerationService;

@RestController
@RequestMapping("/api/generations")
public class ExportController {

    private final GenerationService service;

    public ExportController(GenerationService service) {
        this.service = service;
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportZip(@PathVariable("id") String generationId) {
        CodeBundleDto bundle;
        try {
            bundle = service.getCode(generationId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        List<CodeFileDto> files = bundle.files;
        if (files == null || files.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos)) {
                for (CodeFileDto file : files) {
                    if (file.path == null || file.content == null) continue;
                    ZipEntry entry = new ZipEntry(file.path);
                    zos.putNextEntry(entry);
                    zos.write(file.content.getBytes(StandardCharsets.UTF_8));
                    zos.closeEntry();
                }
            }

            byte[] zipBytes = baos.toByteArray();
            String filename = "project-" + generationId.toLowerCase() + ".zip";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/zip"));
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
            headers.setContentLength(zipBytes.length);

            return new ResponseEntity<>(zipBytes, headers, HttpStatus.OK);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
