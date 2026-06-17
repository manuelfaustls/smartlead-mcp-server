/**
 * SmartLead MCP Server - Lead Management Client
 *
 * Client module for lead management API endpoints.
 * Handles all lead-related operations including CRUD operations, status management, and messaging.
 *
 * @author LeadMagic Team
 * @version 1.5.0
 */

import { BaseSmartLeadClient } from '../../client/base.js';
import type {
  Lead,
  ListLeadsByCampaignRequest,
  ReplyToLeadFromMasterInboxRequest,
  SuccessResponse,
  UpdateLeadByIdRequest,
} from '../../types.js';

// Additional types for leads client
export interface FetchAllLeadsFromAccountParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}

export interface FetchLeadsFromGlobalBlocklistParams {
  limit?: number;
  offset?: number;
}

export interface ForwardReplyRequest {
  forward_to_email: string;
  message?: string;
  include_original?: boolean;
}

/**
 * Lead Management Client
 *
 * Provides methods for managing SmartLead leads including:
 * - Adding and updating leads
 * - Managing lead status and categories
 * - Lead messaging and communication
 * - Global blocklist management
 */
export class LeadClient extends BaseSmartLeadClient {
  // ================================
  // LEAD MANAGEMENT METHODS
  // ================================

  /**
   * List all leads by campaign ID
   * GET /campaigns/{campaign_id}/leads
   */
  async listLeadsByCampaign(
    campaignId: number,
    params?: Omit<ListLeadsByCampaignRequest, 'campaign_id'>
  ): Promise<SuccessResponse> {
    const queryParams = params
      ? Object.fromEntries(
          Object.entries({
            limit: params.limit,
            offset: params.offset,
            status: params.status,
            search: params.search,
          }).filter(([, v]) => v !== undefined)
        )
      : {};
    const response = await this.withRetry(
      () => this.apiClient.get(`/campaigns/${campaignId}/leads`, { params: queryParams }),
      'list leads by campaign'
    );
    return response.data;
  }

  /**
   * Fetch lead categories
   */
  async fetchLeadCategories(): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/leads/fetch-categories'),
      'fetch lead categories'
    );
    return response.data;
  }

  /**
   * Fetch lead by email address
   */
  async fetchLeadByEmail(email: string): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/leads', { params: { email } }),
      'fetch lead by email'
    );
    return response.data;
  }

  /**
   * Add leads to a campaign by ID
   */
  async addLeadsToCampaign(campaignId: number, leads: Lead[]): Promise<SuccessResponse> {
    // The API expects the array under `lead_list` (not `leads`) and uses
    // company_name / phone_number / custom_fields. Map the tool's field names.
    const lead_list = (leads as any[]).map((l) => ({
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      company_name: l.company_name ?? l.company,
      phone_number: l.phone_number ?? l.phone,
      custom_fields:
        l.custom_fields ??
        (l.title || l.job_title ? { job_title: l.title ?? l.job_title } : undefined),
    }));
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads`, { lead_list }),
      'add leads to campaign'
    );
    return response.data;
  }

  /**
   * Resume lead by campaign ID
   */
  async resumeLeadByCampaign(campaignId: number, leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/resume`),
      'resume lead by campaign'
    );
    return response.data;
  }

  /**
   * Pause lead by campaign ID
   */
  async pauseLeadByCampaign(campaignId: number, leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/pause`),
      'pause lead by campaign'
    );
    return response.data;
  }

  /**
   * Delete lead by campaign ID
   */
  async deleteLeadByCampaign(campaignId: number, leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.delete(`/campaigns/${campaignId}/leads/${leadId}`),
      'delete lead by campaign'
    );
    return response.data;
  }

  /**
   * Unsubscribe/Pause lead from campaign
   */
  async unsubscribeLeadFromCampaign(campaignId: number, leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/unsubscribe`),
      'unsubscribe lead from campaign'
    );
    return response.data;
  }

  /**
   * Unsubscribe lead from all campaigns
   */
  async unsubscribeLeadFromAllCampaigns(leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/leads/${leadId}/unsubscribe-all`),
      'unsubscribe lead from all campaigns'
    );
    return response.data;
  }

  /**
   * Add lead/domain to global block list
   */
  async addLeadToGlobalBlocklist(email: string): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () =>
        this.apiClient.post('/leads/add-domain-block-list', {
          domain_block_list: [email],
          client_id: null,
        }),
      'add lead to global blocklist'
    );
    return response.data;
  }

  /**
   * Remove an email/domain from the global block list.
   * The API deletes by entry id, so resolve the id via get-domain-block-list first.
   */
  async removeFromGlobalBlocklist(emailOrDomain: string): Promise<SuccessResponse> {
    const list = await this.withRetry(
      () =>
        this.apiClient.get('/leads/get-domain-block-list', {
          params: { filter_email_or_domain: emailOrDomain, limit: 1000 },
        }),
      'fetch global blocklist for removal'
    );
    const entries = Array.isArray(list.data) ? list.data : [];
    const match = entries.find((e: any) => e.email_or_domain === emailOrDomain);
    if (!match) {
      return {
        ok: false,
        message: `Not found on global block list: ${emailOrDomain}`,
      } as unknown as SuccessResponse;
    }
    const response = await this.withRetry(
      () => this.apiClient.delete('/leads/delete-domain-block-list', { params: { id: match.id } }),
      'remove from global blocklist'
    );
    return response.data;
  }

  /**
   * Fetch all leads from entire account
   */
  async fetchAllLeadsFromAccount(
    params?: FetchAllLeadsFromAccountParams
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/leads', { params }),
      'fetch all leads from account'
    );
    return response.data;
  }

  /**
   * Fetch leads from global block list
   */
  async fetchLeadsFromGlobalBlocklist(
    params?: FetchLeadsFromGlobalBlocklistParams
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get('/leads/get-domain-block-list', { params }),
      'fetch leads from global blocklist'
    );
    return response.data;
  }

  /**
   * Update lead using the lead ID
   */
  async updateLeadById(
    campaignId: number,
    leadId: number,
    leadData: UpdateLeadByIdRequest
  ): Promise<SuccessResponse> {
    // The API path is campaign-scoped: POST /campaigns/{cid}/leads/{lid}.
    // Map the tool's field names to the API's (company_name / phone_number /
    // custom_fields) and drop the routing ids from the body.
    const l = leadData as any;
    const body = {
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      company_name: l.company_name ?? l.company,
      phone_number: l.phone_number ?? l.phone,
      custom_fields:
        l.custom_fields ??
        (l.title || l.job_title ? { job_title: l.title ?? l.job_title } : undefined),
    };
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}`, body),
      'update lead by ID'
    );
    return response.data;
  }

  /**
   * Update a lead's category based on their campaign
   */
  async updateLeadCategory(
    campaignId: number,
    leadId: number,
    category: string
  ): Promise<SuccessResponse> {
    // The API expects a numeric `category_id`, not the label string. Resolve the
    // label to its workspace-specific id via fetch-categories; a numeric id passed
    // as a string is used directly.
    let categoryId = Number(category);
    if (Number.isNaN(categoryId)) {
      const cats = await this.apiClient.get('/leads/fetch-categories');
      const list = Array.isArray(cats.data) ? cats.data : [];
      const match = list.find(
        (c: any) => String(c.name).toLowerCase() === String(category).toLowerCase()
      );
      if (!match) {
        throw new Error(`Unknown lead category "${category}". Use one from fetch-categories.`);
      }
      categoryId = match.id;
    }
    const response = await this.withRetry(
      () =>
        this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/category`, {
          category_id: categoryId,
          pause_lead: false,
        }),
      'update lead category'
    );
    return response.data;
  }

  /**
   * Fetch lead message history based on campaign
   */
  async fetchLeadMessageHistory(campaignId: number, leadId: number): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.get(`/campaigns/${campaignId}/leads/${leadId}/message-history`),
      'fetch lead message history'
    );
    return response.data;
  }

  /**
   * Reply to lead from master inbox via API
   */
  async replyToLeadFromMasterInbox(
    campaignId: number,
    leadId: number,
    message: ReplyToLeadFromMasterInboxRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/reply`, message),
      'reply to lead from master inbox'
    );
    return response.data;
  }

  /**
   * Forward a reply
   */
  async forwardReply(
    campaignId: number,
    leadId: number,
    forwardData: ForwardReplyRequest
  ): Promise<SuccessResponse> {
    const response = await this.withRetry(
      () => this.apiClient.post(`/campaigns/${campaignId}/leads/${leadId}/forward`, forwardData),
      'forward reply'
    );
    return response.data;
  }
}
