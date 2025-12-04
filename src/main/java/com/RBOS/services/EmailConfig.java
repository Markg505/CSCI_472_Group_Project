package com.RBOS.services;

import java.io.InputStream;
import java.util.Properties;

public class EmailConfig {
    private String host;
    private int port;
    private String username;
    private String password;
    private boolean auth;
    private boolean starttls;

    public EmailConfig() {
        // Try to load from properties file first, then fall back to environment variables
        Properties props = loadPropertiesFile();

        if (props != null && props.getProperty("smtp.username") != null) {
            // Load from properties file
            this.host = props.getProperty("smtp.host", "smtp.gmail.com");
            this.port = Integer.parseInt(props.getProperty("smtp.port", "587"));
            this.username = props.getProperty("smtp.username");
            this.password = props.getProperty("smtp.password");
        } else {
            // Fall back to environment variables
            this.host = System.getenv("SMTP_HOST") != null ? System.getenv("SMTP_HOST") : "smtp.gmail.com";
            this.port = System.getenv("SMTP_PORT") != null ? Integer.parseInt(System.getenv("SMTP_PORT")) : 587;
            this.username = System.getenv("SMTP_USERNAME");
            this.password = System.getenv("SMTP_PASSWORD");
        }

        this.auth = true;
        this.starttls = true;
    }

    private Properties loadPropertiesFile() {
        Properties props = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream("email.properties")) {
            if (input != null) {
                props.load(input);
                return props;
            }
        } catch (Exception e) {
            System.err.println("Could not load email.properties: " + e.getMessage());
        }
        return null;
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