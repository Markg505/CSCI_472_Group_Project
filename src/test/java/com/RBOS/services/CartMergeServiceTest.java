package com.RBOS.services;

import static org.junit.Assert.*;

import com.RBOS.models.Inventory;
import com.RBOS.models.MenuItem;
import com.RBOS.models.OrderItem;
import org.junit.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CartMergeServiceTest {

    @Test
    public void mergesAndClampsQuantitiesWithConflicts() {
        CartMergeService service = new CartMergeService();

        CartMergeService.MergeItem local = new CartMergeService.MergeItem();
        local.itemId = "item-1";
        local.qty = 3;
        local.unitPrice = 10.0;
        local.name = "Margherita";

        OrderItem server = new OrderItem();
        server.setItemId("item-1");
        server.setQty(1);
        server.setUnitPrice(10.0);

        Inventory inventory = new Inventory();
        inventory.setItemId("item-1");
        inventory.setQtyOnHand(2);
        MenuItem menuItem = new MenuItem();
        menuItem.setName("Margherita");
        menuItem.setPrice(10.0);
        inventory.setMenuItem(menuItem);

        Map<String, Inventory> inv = new HashMap<>();
        inv.put("item-1", inventory);

        CartMergeService.MergeResult result = service.merge(List.of(local), List.of(server), inv);

        assertEquals(1, result.getMergedItems().size());
        assertEquals(2L, (long) result.getMergedItems().get(0).getQty());

        assertEquals(1, result.getClamped().size());
        assertEquals("item-1", result.getClamped().get(0).itemId);

        assertEquals(1, result.getMergedQuantities().size());
        assertEquals(4L, (long) result.getMergedQuantities().get(0).requested);
    }

    @Test
    public void dropsUnavailableItems() {
        CartMergeService service = new CartMergeService();

        CartMergeService.MergeItem local = new CartMergeService.MergeItem();
        local.itemId = "item-2";
        local.qty = 2;

        Map<String, Inventory> inv = new HashMap<>();
        inv.put("item-2", null);

        CartMergeService.MergeResult result = service.merge(List.of(local), new ArrayList<>(), inv);

        assertTrue(result.getMergedItems().isEmpty());
        assertEquals(1, result.getDropped().size());
        assertEquals("out_of_stock", result.getDropped().get(0).reason);
    }
}
