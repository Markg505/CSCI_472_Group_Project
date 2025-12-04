package com.RBOS.utils;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Set;
import java.util.stream.Collectors;

public class HistoryValidation {
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final Set<String> ALLOWED_ORDER_STATUSES = Set.of("cart", "placed", "paid", "cancelled");
    public static final Set<String> ALLOWED_RESERVATION_STATUSES = Set.of("pending", "confirmed", "cancelled", "no_show");

    public static int normalizePage(Integer requested) {
        if (requested == null || requested < 1) {
            return 1;
        }
        return requested;
    }

    public static int clampPageSize(Integer requested) {
        if (requested == null || requested < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requested, MAX_PAGE_SIZE);
    }

    public static boolean isPrivilegedRole(String role) {
        if (role == null) {
            return false;
        }
        String lower = role.toLowerCase();
        return lower.equals("admin") || lower.equals("staff");
    }

    public static String resolveScopedUserId(String sessionRole, String sessionUserId, String requestedUserId) {
        boolean privileged = isPrivilegedRole(sessionRole);

        if (requestedUserId != null && !requestedUserId.isEmpty()) {
            if (privileged) {
                return requestedUserId;
            }
            if (sessionUserId == null || !sessionUserId.equals(requestedUserId)) {
                throw new SecurityException("Cross-account history access denied");
            }
            return sessionUserId;
        }

        if (privileged) {
            return null; // unscoped admin query
        }

        if (sessionUserId == null || sessionUserId.isEmpty()) {
            throw new SecurityException("Authentication required for history access");
        }
        return sessionUserId;
    }

    public static String normalizeStatus(String status, Set<String> allowedStatuses) {
        if (status == null || status.isBlank()) {
            return null;
        }
        if ("all".equalsIgnoreCase(status)) {
            return "all";
        }

        String normalized = status.toLowerCase();
        if (!allowedStatuses.contains(normalized)) {
            throw new IllegalArgumentException("Invalid status '" + status + "'. Allowed statuses: " +
                    allowedStatuses.stream().sorted().collect(Collectors.joining(", ")) + ", all");
        }
        return normalized;
    }

    public static Instant parseIsoInstant(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid " + fieldName + " – expected ISO-8601 timestamp");
        }
    }

    public static Instant retentionHorizon(Instant now, int months) {
        return now.atZone(ZoneOffset.UTC).minusMonths(months).toInstant();
    }

    public static Instant clampStart(Instant requested, Instant retentionHorizon, Instant now) {
        if (requested == null) return null;
        Instant base = requested;
        if (base.isBefore(retentionHorizon)) {
            return retentionHorizon;
        }
        return base;
    }

    public static Instant clampEnd(Instant requested, Instant retentionHorizon, Instant now) {
        Instant base = requested != null ? requested : now;
        if (base.isBefore(retentionHorizon)) {
            return retentionHorizon;
        }
        // allow future end dates (e.g., upcoming reservations); do not clamp to now
        return base;
    }

    public static String formatInstant(Instant instant) {
        return instant != null ? DateTimeFormatter.ISO_INSTANT.format(instant) : null;
    }
}
