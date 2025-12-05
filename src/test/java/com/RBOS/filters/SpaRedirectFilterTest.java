package com.RBOS.filters;

import static org.junit.Assert.*;

import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.lang.reflect.Proxy;
import org.junit.Test;

public class SpaRedirectFilterTest {

    @Test
    public void forwardsClientRouteToIndex() throws Exception {
        SpaRedirectFilter filter = new SpaRedirectFilter();
        ForwardCapture forward = new ForwardCapture();
        ChainCapture chain = new ChainCapture();

        HttpServletRequest req = buildRequest("GET", "/dashboard", "", forward);
        HttpServletResponse resp = buildResponse();

        filter.doFilter(req, resp, chain);

        assertEquals("/index.html", forward.forwardedTo);
        assertFalse("Filter chain should be short-circuited for SPA route", chain.called);
    }

    @Test
    public void passesThroughForAssetsAndApi() throws Exception {
        SpaRedirectFilter filter = new SpaRedirectFilter();
        ForwardCapture forward = new ForwardCapture();
        ChainCapture chain = new ChainCapture();

        HttpServletRequest assetReq = buildRequest("GET", "/assets/logo.png", "", forward);
        filter.doFilter(assetReq, buildResponse(), chain);
        assertTrue("Assets should continue down the chain", chain.called);
        assertNull(forward.forwardedTo);

        chain.called = false;
        HttpServletRequest apiReq = buildRequest("GET", "/api/orders", "", forward);
        filter.doFilter(apiReq, buildResponse(), chain);
        assertTrue("API requests should continue down the chain", chain.called);
        assertNull(forward.forwardedTo);
    }

    @Test
    public void trimsContextPathBeforeRouting() throws Exception {
        SpaRedirectFilter filter = new SpaRedirectFilter();
        ForwardCapture forward = new ForwardCapture();
        ChainCapture chain = new ChainCapture();

        HttpServletRequest req = buildRequest("GET", "/app/admin", "/app", forward);
        filter.doFilter(req, buildResponse(), chain);

        assertEquals("Context path should be removed before SPA check", "/index.html", forward.forwardedTo);
        assertFalse(chain.called);
    }

    private HttpServletRequest buildRequest(String method, String uri, String contextPath, ForwardCapture forward) {
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "getRequestURI":
                            return uri;
                        case "getContextPath":
                            return contextPath;
                        case "getMethod":
                            return method;
                        case "getRequestDispatcher":
                            return forward;
                        default:
                            return null;
                    }
                });
    }

    private HttpServletResponse buildResponse() {
        return (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, m, args) -> null);
    }

    private static class ForwardCapture implements RequestDispatcher {
        String forwardedTo;

        @Override
        public void forward(ServletRequest request, ServletResponse response)
                throws IOException, jakarta.servlet.ServletException {
            this.forwardedTo = "/index.html";
        }

        @Override
        public void include(ServletRequest request, ServletResponse response)
                throws IOException, jakarta.servlet.ServletException {
        }
    }

    private static class ChainCapture implements FilterChain {
        boolean called;

        @Override
        public void doFilter(ServletRequest request, ServletResponse response) {
            called = true;
        }
    }
}
