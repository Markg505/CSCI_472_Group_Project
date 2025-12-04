package com.RBOS.models;

public class Reservation {
    private String reservationId;
    private String userId;
    private String tableId;
    private String startUtc;
    private String endUtc;
    private Integer partySize;
    private String status; // 'pending', 'confirmed', 'cancelled', 'no_show'
    private String notes;
    private String createdUtc;
    private String guestName;
    private Double reservationFee;

    private User user;
    private DiningTable diningTable;

    public Reservation() {
    }

    public Reservation(String reservationId, String userId, String tableId,
            String startUtc, String endUtc, Integer partySize,
            String status, String notes, String createdUtc) {
        this.reservationId = reservationId;
        this.userId = userId;
        this.tableId = tableId;
        this.startUtc = startUtc;
        this.endUtc = endUtc;
        this.partySize = partySize;
        this.status = status;
        this.notes = notes;
        this.createdUtc = createdUtc;
    }

    // Getters and setters
    public String getReservationId() {
        return reservationId;
    }

    public void setReservationId(String reservationId) {
        this.reservationId = reservationId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getTableId() {
        return tableId;
    }

    public void setTableId(String tableId) {
        this.tableId = tableId;
    }

    public String getStartUtc() {
        return startUtc;
    }

    public void setStartUtc(String startUtc) {
        this.startUtc = startUtc;
    }

    public String getEndUtc() {
        return endUtc;
    }

    public void setEndUtc(String endUtc) {
        this.endUtc = endUtc;
    }

    public Integer getPartySize() {
        return partySize;
    }

    public void setPartySize(Integer partySize) {
        this.partySize = partySize;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getCreatedUtc() {
        return createdUtc;
    }

    public void setCreatedUtc(String createdUtc) {
        this.createdUtc = createdUtc;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public Double getReservationFee() {
        return reservationFee;
    }

    public void setReservationFee(Double reservationFee) {
        this.reservationFee = reservationFee;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public DiningTable getDiningTable() {
        return diningTable;
    }

    public void setDiningTable(DiningTable diningTable) {
        this.diningTable = diningTable;
    }
}
