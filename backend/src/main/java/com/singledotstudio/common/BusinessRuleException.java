package com.singledotstudio.common;

/** A request that is well-formed JSON but breaks a business rule. The message is safe to show to the customer. */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
