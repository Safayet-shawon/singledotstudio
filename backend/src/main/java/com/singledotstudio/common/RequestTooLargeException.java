package com.singledotstudio.common;

import java.io.IOException;

/** Thrown while reading a request body that is bigger than the configured limit. */
public class RequestTooLargeException extends IOException {
    public RequestTooLargeException() {
        super("Request body too large");
    }
}
