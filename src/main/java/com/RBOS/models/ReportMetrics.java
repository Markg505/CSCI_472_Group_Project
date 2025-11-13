package com.RBOS.models;

public class ReportMetrics {
    private int todayReservations;
    private int pendingReservations;
    private double todayRevenue;
    private int todayOrders;
    private int totalCustomers;
    private int totalReservations;
    private int totalOrders;

    public ReportMetrics(int todayReservations, int pendingReservations, double todayRevenue,
                         int todayOrders, int totalCustomers, int totalReservations, int totalOrders) {
        this.todayReservations = todayReservations;
        this.pendingReservations = pendingReservations;
        this.todayRevenue = todayRevenue;
        this.todayOrders = todayOrders;
        this.totalCustomers = totalCustomers;
        this.totalReservations = totalReservations;
        this.totalOrders = totalOrders;
    }

    public int getTodayReservations() {
        return todayReservations;
    }

    public void setTodayReservations(int todayReservations) {
        this.todayReservations = todayReservations;
    }

    public int getPendingReservations() {
        return pendingReservations;
    }

    public void setPendingReservations(int pendingReservations) {
        this.pendingReservations = pendingReservations;
    }

    public double getTodayRevenue() {
        return todayRevenue;
    }

    public void setTodayRevenue(double todayRevenue) {
        this.todayRevenue = todayRevenue;
    }

    public int getTodayOrders() {
        return todayOrders;
    }

    public void setTodayOrders(int todayOrders) {
        this.todayOrders = todayOrders;
    }

    public int getTotalCustomers() {
        return totalCustomers;
    }

    public void setTotalCustomers(int totalCustomers) {
        this.totalCustomers = totalCustomers;
    }

    public int getTotalReservations() {
        return totalReservations;
    }

    public void setTotalReservations(int totalReservations) {
        this.totalReservations = totalReservations;
    }

    public int getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(int totalOrders) {
        this.totalOrders = totalOrders;
    }
}