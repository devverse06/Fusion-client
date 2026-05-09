import axios from "axios";

import {
    newAdminAuditLogsRoute,
    newAdminPoliciesRoute,
    newAdminUserDetailRoute,
    newAdminUsersRoute,
    newAmendRoute,
    newApproveRoute,
    newArchiveListRoute,
    newArchiveRoute,
    newCloseRoute,
    newDeleteDraftRoute,
    newDesignationsRoute,
    newDraftsRoute,
    newFileDetailRoute,
    newFilesRoute,
    newFileTypesRoute,
    newForwardRoute,
    newHistoryRoute,
    newInboxRoute,
    newOutboxRoute,
    newPendingRoute,
    newRejectRoute,
    newReturnRoute,
    newSendRoute,
} from "../../routes/filetrackingRoutes";

axios.defaults.withCredentials = true;

const authConfig = (token) => ({
    withCredentials: true,
    headers: {
        Authorization: `Token ${token}`,
    },
});

const listPayload = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && Array.isArray(payload.results)) {
        return payload.results;
    }

    return [];
};

export const listNewFiles = async (token, params = {}) => {
    const response = await axios.get(newFilesRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const createNewFile = async (payload, token) => {
    const response = await axios.post(newFilesRoute, payload, authConfig(token));
    return response.data;
};

export const getNewFileDetail = async (id, token) => {
    const response = await axios.get(newFileDetailRoute(id), authConfig(token));
    return response.data;
};

export const updateNewFileDetail = async (id, payload, token) => {
    const response = await axios.put(newFileDetailRoute(id), payload, authConfig(token));
    return response.data;
};

export const sendFile = async (id, payload, token) => {
    const response = await axios.post(newSendRoute(id), payload, authConfig(token));
    return response.data;
};

export const forwardFile = async (id, payload, token) => {
    const response = await axios.post(newForwardRoute(id), payload, authConfig(token));
    return response.data;
};

export const returnFile = async (id, payload, token) => {
    const response = await axios.post(newReturnRoute(id), payload, authConfig(token));
    return response.data;
};

export const amendFile = async (id, payload, token) => {
    const response = await axios.post(newAmendRoute(id), payload, authConfig(token));
    return response.data;
};

export const approveFile = async (id, payload, token) => {
    const response = await axios.post(newApproveRoute(id), payload, authConfig(token));
    return response.data;
};

export const rejectFile = async (id, payload, token) => {
    const response = await axios.post(newRejectRoute(id), payload, authConfig(token));
    return response.data;
};

export const closeFile = async (id, payload, token) => {
    const response = await axios.post(newCloseRoute(id), payload, authConfig(token));
    return response.data;
};

export const archiveFile = async (id, payload, token) => {
    const response = await axios.post(newArchiveRoute(id), payload, authConfig(token));
    return response.data;
};

export const getFileHistory = async (id, token) => {
    const response = await axios.get(newHistoryRoute(id), authConfig(token));
    return response.data;
};

export const listDrafts = async (token) => {
    const response = await axios.get(newDraftsRoute, authConfig(token));
    return listPayload(response.data);
};

export const deleteDraft = async (id, token) => {
    const response = await axios.delete(newDeleteDraftRoute(id), authConfig(token));
    return response.data;
};

export const listInbox = async (token, params = {}) => {
    const response = await axios.get(newInboxRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const listOutbox = async (token, params = {}) => {
    const response = await axios.get(newOutboxRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const listPending = async (token, params = {}) => {
    const response = await axios.get(newPendingRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const listArchive = async (token, params = {}) => {
    const response = await axios.get(newArchiveListRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const listFileTypes = async (token) => {
    const response = await axios.get(newFileTypesRoute, authConfig(token));
    return response.data;
};

export const listDesignations = async (token) => {
    const response = await axios.get(newDesignationsRoute, authConfig(token));
    return listPayload(response.data);
};

export const listAdminUsers = async (token, params = {}) => {
    const response = await axios.get(newAdminUsersRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};

export const createAdminUser = async (payload, token) => {
    const response = await axios.post(newAdminUsersRoute, payload, authConfig(token));
    return response.data;
};

export const updateAdminUser = async (id, payload, token) => {
    const response = await axios.put(newAdminUserDetailRoute(id), payload, authConfig(token));
    return response.data;
};

export const deactivateAdminUser = async (id, token) => {
    const response = await axios.delete(newAdminUserDetailRoute(id), authConfig(token));
    return response.data;
};

export const listAdminPolicies = async (token) => {
    const response = await axios.get(newAdminPoliciesRoute, authConfig(token));
    return listPayload(response.data);
};

export const updateAdminPolicies = async (payload, token) => {
    const response = await axios.put(newAdminPoliciesRoute, payload, authConfig(token));
    return response.data;
};

export const listAdminAuditLogs = async (token, params = {}) => {
    const response = await axios.get(newAdminAuditLogsRoute, { ...authConfig(token), params });
    return listPayload(response.data);
};
