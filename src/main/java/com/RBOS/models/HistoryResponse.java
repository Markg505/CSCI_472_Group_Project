package com.RBOS.models;

import java.util.List;

public class HistoryResponse<T> {
    private List<T> items;
    private int page;
    private int pageSize;
    private int total;
    private int retentionMonths;
    private String retentionHorizon;

    public HistoryResponse() {
        // Default constructor for deserializers
    }

    public HistoryResponse(List<T> items, int page, int pageSize, int total, int retentionMonths, String retentionHorizon) {
        this.items = items;
        this.page = page;
        this.pageSize = pageSize;
        this.total = total;
        this.retentionMonths = retentionMonths;
        this.retentionHorizon = retentionHorizon;
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
        this.items = items;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getRetentionMonths() {
        return retentionMonths;
    }

    public void setRetentionMonths(int retentionMonths) {
        this.retentionMonths = retentionMonths;
    }

    public String getRetentionHorizon() {
        return retentionHorizon;
    }

    public void setRetentionHorizon(String retentionHorizon) {
        this.retentionHorizon = retentionHorizon;
    }
}
