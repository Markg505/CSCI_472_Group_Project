package com.RBOS.services;

import java.util.Properties;

public class EmailConfig {
    private String host;
    private int port;
    private String username;
    private String password;
    private boolean auth;
    private boolean starttls;
    
    public EmailConfig() {
        // Default configuration - should be externalized:
        // # SMTP Configuration
        // SMTP_HOST=smtp.gmail.com
        // SMTP_PORT=587
        // SMTP_USERNAME=tempemail@gmail.com
        // SMTP_PASSWORD=password
        // ADMIN_EMAIL=admin@restaurantgem.com

        // # For Gmail, you need to:
        // # 1. Enable 2-factor authentication
        // # 2. Generate an App Password
        // # 3. Use the App Password in SMTP_PASSWORD

        this.host = System.getenv("SMTP_HOST") != null ? System.getenv("SMTP_HOST") : "smtp.gmail.com";
        this.port = System.getenv("SMTP_PORT") != null ? Integer.parseInt(System.getenv("SMTP_PORT")) : 587;
        this.username = System.getenv("SMTP_USERNAME");
        this.password = System.getenv("SMTP_PASSWORD");
        this.auth = true;
        this.starttls = true;
    }
    
    public Properties getProperties() {
        Properties props = new Properties();
        props.put("mail.smtp.auth", String.valueOf(auth));
        props.put("mail.smtp.starttls.enable", String.valueOf(starttls));
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.ssl.trust", host);
        return props;
    }
    
    // Getters and setters
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public boolean isAuth() { return auth; }
    public void setAuth(boolean auth) { this.auth = auth; }
    public boolean isStarttls() { return starttls; }
    public void setStarttls(boolean starttls) { this.starttls = starttls; }
}