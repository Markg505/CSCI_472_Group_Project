package com.rbos.api;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

@ApplicationPath("/api") // all API URLs start with /api
public class AppConfig extends Application {
}