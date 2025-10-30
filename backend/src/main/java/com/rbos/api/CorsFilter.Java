package com.rbos.api;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
public class CorsFilter implements ContainerResponseFilter {
  @Override public void filter(ContainerRequestContext req, ContainerResponseContext res) throws IOException {
    res.getHeaders().putSingle("Access-Control-Allow-Origin", "*");
    res.getHeaders().putSingle("Access-Control-Allow-Headers", "origin, content-type, accept, authorization");
    res.getHeaders().putSingle("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }
}
