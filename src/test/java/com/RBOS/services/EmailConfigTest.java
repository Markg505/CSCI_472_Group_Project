package com.RBOS.services;

import static org.junit.Assert.*;

import java.util.Properties;
import org.junit.Test;

public class EmailConfigTest {

    @Test
    public void gettersAndPropertiesReflectOverrides() {
        EmailConfig config = new EmailConfig();
        config.setHost("smtp.test.com");
        config.setPort(2525);
        config.setUsername("user@test.com");
        config.setPassword("secret");
        config.setAuth(false);
        config.setStarttls(false);

        Properties props = config.getProperties();
        assertEquals("smtp.test.com", props.getProperty("mail.smtp.host"));
        assertEquals("2525", props.getProperty("mail.smtp.port"));
        assertEquals("false", props.getProperty("mail.smtp.auth"));
        assertEquals("false", props.getProperty("mail.smtp.starttls.enable"));
        assertEquals("smtp.test.com", props.getProperty("mail.smtp.ssl.trust"));

        assertEquals("smtp.test.com", config.getHost());
        assertEquals(2525, config.getPort());
        assertEquals("user@test.com", config.getUsername());
        assertEquals("secret", config.getPassword());
        assertFalse(config.isAuth());
        assertFalse(config.isStarttls());
    }
}
