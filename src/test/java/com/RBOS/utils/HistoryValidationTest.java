package com.RBOS.utils;

import static org.junit.Assert.*;

import org.junit.Test;

public class HistoryValidationTest {
    @Test
    public void clampPageSizeEnforcesBounds() {
        assertEquals(HistoryValidation.DEFAULT_PAGE_SIZE, HistoryValidation.clampPageSize(null));
        assertEquals(HistoryValidation.DEFAULT_PAGE_SIZE, HistoryValidation.clampPageSize(0));
        assertEquals(50, HistoryValidation.clampPageSize(50));
        assertEquals(HistoryValidation.MAX_PAGE_SIZE, HistoryValidation.clampPageSize(500));
    }

    @Test
    public void normalizePageDefaultsToFirstPage() {
        assertEquals(1, HistoryValidation.normalizePage(null));
        assertEquals(1, HistoryValidation.normalizePage(0));
        assertEquals(3, HistoryValidation.normalizePage(3));
    }

    @Test
    public void resolveScopedUserIdBlocksCrossAccountRequests() {
        // Admin can request any user
        assertNull(HistoryValidation.resolveScopedUserId("admin", "admin-user", null));
        assertEquals("target", HistoryValidation.resolveScopedUserId("admin", "admin-user", "target"));

        // Customers are forced to their own user id
        try {
            HistoryValidation.resolveScopedUserId("customer", "user-a", "user-b");
            fail("Cross-account access should throw a SecurityException");
        } catch (SecurityException expected) {
            // expected
        }
        assertEquals("user-a", HistoryValidation.resolveScopedUserId("customer", "user-a", null));
        assertEquals("user-a", HistoryValidation.resolveScopedUserId("customer", "user-a", "user-a"));
    }
}
