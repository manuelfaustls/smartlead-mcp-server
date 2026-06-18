/**
 * SmartLead MCP Server - Campaign Management Client
 *
 * Client module for campaign management API endpoints.
 * Handles all campaign-related operations including creation, updates, sequences, and analytics.
 *
 * @author LeadMagic Team
 * @version 1.5.0
 */

import { BaseSmartLeadClient } from '../../client/base.js';
import type {
  CreateCampaignRequest,
  EmailSequence,
  ExportCampaignDataRequest,
  FetchAllCampaignsUsingLeadIdRequest,
  FetchCampaignAnalyticsByDateRangeRequest,
  GetCampaignSequenceAnalyticsRequest,
  GetCampaignsWithAnalyticsRequest,
  ListCampaignsRequest,
  SuccessResponse,
  UpdateCampaignScheduleRequest,
  UpdateCampaignSettingsRequest,
} from '../../types.js';

/**
 * Campaign Management Client
 *
 * Provides methods for managing SmartLead campaigns including:
 * - Creating and updating campaigns
 * - Managing campaign schedules and settings
 * - Email sequence management
 * - Campaign analytics and reporting
 */
export class CampaignManagementClient extends BaseSmartLeadClient {
  // ================================
  // CAMPAIGN MANAGEMENT METHODS
  // ================================

  /**
   * Create a new campaign
   */
  async createCampaign(params: CreateCampaignRequest): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post('/campaigns/create', params),
      'create campaign'
    );
    return response.data;
  }

  /**
   * Update campaign schedule
   */
  async updateCampaignSchedule(
    campaignId: number,
    params: UpdateCampaignScheduleRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/schedule`, params),
      'update campaign schedule'
    );
    return response.data;
  }

  /**
   * Update campaign settings
   */
  async updateCampaignSettings(
    campaignId: number,
    params: UpdateCampaignSettingsRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/settings`, params),
      'update campaign settings'
    );
    return response.data;
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: number, status: string): Promise<SuccessResponse> {
    const response = await this.withRetry(
      // API expects POST (not PATCH) on /campaigns/{id}/status
      () => this.apiClient.post(`/campaigns/${campaignId}/status`, { status }),
      'update campaign status'
    );
    return response.data;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get(`/campaigns/${campaignId}`),
      'get campaign'
    );
    return response.data;
  }

  /**
   * List all campaigns
   */
  async listCampaigns(params?: ListCampaignsRequest): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/campaigns', { params }),
      'list campaigns'
    );
    return response.data;
  }

  /**
   * Save campaign sequence
   */
  async saveCampaignSequence(
    campaignId: number,
    sequence: EmailSequence
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      // API expects the array wrapped under "sequences"
      () => this.apiClient.post(`/campaigns/${campaignId}/sequences`, { sequences: sequence }),
      'save campaign sequence'
    );
    return response.data;
  }

  /**
   * Get campaign sequence
   */
  async getCampaignSequence(campaignId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get(`/campaigns/${campaignId}/sequences`),
      'get campaign sequence'
    );
    return response.data;
  }

  /**
   * Get campaigns with analytics (combined endpoint)
   */
  async getCampaignsWithAnalytics(
    params?: GetCampaignsWithAnalyticsRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/campaigns/analytics', { params }),
      'get campaigns with analytics'
    );
    return response.data;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.delete(`/campaigns/${campaignId}`),
      'delete campaign'
    );
    return response.data;
  }

  /**
   * Export campaign data
   */
  async exportCampaignData(
    campaignId: number,
    params?: ExportCampaignDataRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get(`/campaigns/${campaignId}/leads-export`, { params }),
      'export campaign data'
    );
    return response.data;
  }

  /**
   * Fetch campaign analytics by date range
   * Uses /analytics/campaign/overall-stats; the /campaigns/{id}/analytics
   * route returns lifetime aggregates only, with no date-range support
   */
  async fetchCampaignAnalyticsByDateRange(
    campaignId: number,
    params: FetchCampaignAnalyticsByDateRangeRequest
  ): Promise<SuccessResponse> {
    const analyticsParams = {
      start_date: params.start_date,
      end_date: params.end_date,
      timezone: params.timezone ?? 'Etc/GMT',
      full_data: true,
    };
    const response = await this.withRetry(
      () => this.apiClient.get('/analytics/campaign/overall-stats', { params: analyticsParams }),
      'fetch campaign analytics by date range'
    );
    return response.data;
  }

  /**
   * Get campaign sequence analytics
   * Uses /analytics/campaign/response-stats (GET /campaigns/{id}/sequence/analytics returns 404)
   */
  async getCampaignSequenceAnalytics(
    campaignId: number,
    params?: GetCampaignSequenceAnalyticsRequest
  ): Promise<SuccessResponse> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const analyticsParams = {
      start_date: params?.start_date ?? start.toISOString().slice(0, 10),
      end_date: params?.end_date ?? end.toISOString().slice(0, 10),
      timezone: 'Etc/GMT',
      full_data: true,
    };
    const response = await this.withRetry(
      () =>
        this.apiClient.get('/analytics/campaign/response-stats', { params: analyticsParams }),
      'get campaign sequence analytics'
    );
    return response.data;
  }

  /**
   * Fetch all campaigns using lead ID
   */
  async fetchAllCampaignsUsingLeadId(leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get(`/leads/${leadId}/campaigns`),
      'fetch all campaigns using lead ID'
    );
    return response.data;
  }
}
