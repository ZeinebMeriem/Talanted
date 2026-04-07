package com.aiuigenerator.bff.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.aiuigenerator.bff.dto.AdminStats;
import com.aiuigenerator.bff.service.AdminService;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("AdminController Tests")
class AdminControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private AdminService adminService;

  @Test
  @DisplayName("Should return admin statistics")
  void testGetAdminStats() throws Exception {
    AdminStats stats = new AdminStats();
    stats.totalUsers = 42;
    stats.totalGenerations = 156;
    stats.completedGenerations = 142;
    stats.failedGenerations = 14;
    stats.successRate = 91.0;

    when(adminService.getStats()).thenReturn(stats);

    mockMvc.perform(get("/api/admin/stats")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalUsers").value(42))
        .andExpect(jsonPath("$.totalGenerations").value(156))
        .andExpect(jsonPath("$.successRate").exists());
  }

  @Test
  @DisplayName("Should retrieve service health status")
  void testGetServiceHealth() throws Exception {
    mockMvc.perform(get("/api/admin/health")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Should list all users (admin only)")
  void testListUsers() throws Exception {
    mockMvc.perform(get("/api/admin/users")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("Should deny non-admin access to admin endpoints")
  void testUnauthorizedAdminAccess() throws Exception {
    mockMvc.perform(get("/api/admin/stats")
        .header("Authorization", "Bearer user-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Should retrieve daily generation chart data")
  void testGetDailyChart() throws Exception {
    mockMvc.perform(get("/api/admin/chart/daily")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("Should retrieve failed generations list")
  void testGetFailedGenerations() throws Exception {
    mockMvc.perform(get("/api/admin/failed")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("Should retrieve recent activity feed")
  void testGetActivityFeed() throws Exception {
    mockMvc.perform(get("/api/admin/activity")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("Should enable/disable user")
  void testToggleUserStatus() throws Exception {
    String userId = "user-123";

    mockMvc.perform(post("/api/admin/users/{userId}/enabled", userId)
        .header("Authorization", "Bearer admin-token")
        .param("enabled", "false")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Should delete user (admin only)")
  void testDeleteUser() throws Exception {
    String userId = "user-123";

    mockMvc.perform(post("/api/admin/users/{userId}/delete", userId)
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Should retrieve admin activity logs")
  void testGetAdminLogs() throws Exception {
    mockMvc.perform(get("/api/admin/logs")
        .header("Authorization", "Bearer admin-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }
}
