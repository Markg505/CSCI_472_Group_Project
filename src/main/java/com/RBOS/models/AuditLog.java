package com.RBOS.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AuditLog {
    private String logId;
    private String userId;
    private String userName;
    private String entityType;
    private String entityId;
    private String action;
    private String oldValues;
    private String newValues;
    private String createdUtc;

    public AuditLog() {}

    public AuditLog(String logId, String userId, String userName, String entityType,
                    String entityId, String action, String oldValues, String newValues, String createdUtc) {
        this.logId = logId;
        this.userId = userId;
        this.userName = userName;
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.oldValues = oldValues;
        this.newValues = newValues;
        this.createdUtc = createdUtc;
    }

    // Getters and setters
    public String getLogId() { return logId; }
    public void setLogId(String logId) { this.logId = logId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getOldValues() { return oldValues; }
    public void setOldValues(String oldValues) { this.oldValues = oldValues; }

    public String getNewValues() { return newValues; }
    public void setNewValues(String newValues) { this.newValues = newValues; }

    public String getCreatedUtc() { return createdUtc; }
    public void setCreatedUtc(String createdUtc) { this.createdUtc = createdUtc; }
}
