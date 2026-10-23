package com.singledotstudio.notifications;

import java.util.UUID;

/** Published inside the request transaction; mail is only sent after that transaction has committed. */
public record LeadCreatedEvent(String subjectType, UUID subjectId) {
    public static LeadCreatedEvent estimate(UUID id) {
        return new LeadCreatedEvent("estimate", id);
    }

    public static LeadCreatedEvent consultation(UUID id) {
        return new LeadCreatedEvent("consultation", id);
    }
}
