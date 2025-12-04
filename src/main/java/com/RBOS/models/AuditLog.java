package com.RBOS.models;

public class AuditLog {
    public String logId;
    public String entityType;
    public String entityId;
    public String action;
    public String userId;
    public String userName;
    public String oldValue;
    public String newValue;
    public String createdUtc;

    public AuditLog() {}

    public AuditLog(String logId, String entityType, String entityId, String action,
                    String userId, String userName, String oldValue, String newValue, String createdUtc) {
        this.logId = logId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.userId = userId;
        this.userName = userName;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.createdUtc = createdUtc;
    }
}
