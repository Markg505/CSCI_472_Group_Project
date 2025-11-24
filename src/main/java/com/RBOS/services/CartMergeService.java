package com.RBOS.services;

import com.RBOS.models.Inventory;
import com.RBOS.models.MenuItem;
import com.RBOS.models.OrderItem;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CartMergeService {

    public static class MergeItem {
        public String itemId;
        public Integer qty;
        public Double unitPrice;
        public String name;
    }

    public static class Conflict {
        public String itemId;
        public String reason;
        public Integer requested;
        public Integer applied;
        public String name;

        public Conflict(String itemId, String name, String reason, Integer requested, Integer applied) {
            this.itemId = itemId;
            this.name = name;
            this.reason = reason;
            this.requested = requested;
            this.applied = applied;
        }
    }

    public static class MergeResult {
        private final List<OrderItem> mergedItems;
        private final List<Conflict> dropped;
        private final List<Conflict> clamped;
        private final List<Conflict> mergedQuantities;

        public MergeResult(List<OrderItem> mergedItems, List<Conflict> dropped, List<Conflict> clamped, List<Conflict> mergedQuantities) {
            this.mergedItems = mergedItems;
            this.dropped = dropped;
            this.clamped = clamped;
            this.mergedQuantities = mergedQuantities;
        }

        public List<OrderItem> getMergedItems() {
            return mergedItems;
        }

        public List<Conflict> getDropped() {
            return dropped;
        }

        public List<Conflict> getClamped() {
            return clamped;
        }

        public List<Conflict> getMergedQuantities() {
            return mergedQuantities;
        }
    }

    public MergeResult merge(List<MergeItem> incoming, List<OrderItem> existing, Map<String, Inventory> inventoryByItem) {
        Map<String, Integer> requestedQty = new HashMap<>();
        Map<String, Double> incomingPrice = new HashMap<>();
        Map<String, String> incomingName = new HashMap<>();

        for (OrderItem item : existing) {
            requestedQty.put(item.getItemId(), item.getQty());
            if (item.getUnitPrice() != null) {
                incomingPrice.put(item.getItemId(), item.getUnitPrice());
            }
            if (item.getMenuItem() != null) {
                incomingName.put(item.getItemId(), item.getMenuItem().getName());
            }
        }

        for (MergeItem item : incoming) {
            int nextQty = (item.qty != null ? item.qty : 0) + requestedQty.getOrDefault(item.itemId, 0);
            requestedQty.put(item.itemId, nextQty);
            if (item.unitPrice != null) {
                incomingPrice.put(item.itemId, item.unitPrice);
            }
            if (item.name != null) {
                incomingName.put(item.itemId, item.name);
            }
        }

        List<OrderItem> merged = new ArrayList<>();
        List<Conflict> dropped = new ArrayList<>();
        List<Conflict> clamped = new ArrayList<>();
        List<Conflict> mergedQuantities = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : requestedQty.entrySet()) {
            String itemId = entry.getKey();
            int desired = entry.getValue();
            Inventory inventory = inventoryByItem.get(itemId);

            String itemName = incomingName.getOrDefault(itemId, inventory != null && inventory.getMenuItem() != null
                    ? inventory.getMenuItem().getName()
                    : "");

            if (inventory == null || Boolean.FALSE.equals(inventory.getActive()) || inventory.getQtyOnHand() == null || inventory.getQtyOnHand() <= 0) {
                dropped.add(new Conflict(itemId, itemName, "out_of_stock", desired, 0));
                continue;
            }

            int allowed = Math.min(desired, inventory.getQtyOnHand());
            if (allowed < desired) {
                clamped.add(new Conflict(itemId, itemName, "limited_stock", desired, allowed));
            }

            if (allowed <= 0) {
                dropped.add(new Conflict(itemId, itemName, "out_of_stock", desired, 0));
                continue;
            }

            int existingQty = 0;
            for (OrderItem item : existing) {
                if (item.getItemId().equals(itemId)) {
                    existingQty = item.getQty();
                    break;
                }
            }
            if (existingQty > 0 && desired > existingQty) {
                mergedQuantities.add(new Conflict(itemId, itemName, "merged", desired, allowed));
            }

            double price = resolvePrice(inventory, incomingPrice.get(itemId));

            OrderItem mergedItem = new OrderItem();
            mergedItem.setItemId(itemId);
            mergedItem.setQty(allowed);
            mergedItem.setUnitPrice(price);
            mergedItem.setLineTotal(price * allowed);
            if (inventory != null && inventory.getMenuItem() != null) {
                MenuItem m = new MenuItem();
                m.setItemId(itemId);
                m.setName(inventory.getMenuItem().getName());
                m.setPrice(price);
                mergedItem.setMenuItem(m);
            }
            merged.add(mergedItem);
        }

        return new MergeResult(merged, dropped, clamped, mergedQuantities);
    }

    private double resolvePrice(Inventory inventory, Double fallback) {
        if (inventory != null && inventory.getMenuItem() != null && inventory.getMenuItem().getPrice() != null) {
            return inventory.getMenuItem().getPrice();
        }
        if (fallback != null) {
            return fallback;
        }
        return 0.0;
    }
}
