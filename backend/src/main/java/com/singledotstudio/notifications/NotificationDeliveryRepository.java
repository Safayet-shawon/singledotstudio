package com.singledotstudio.notifications;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, Long> {

    @Query("select n from NotificationDelivery n where n.status = 'FAILED' and n.attempts < :max and n.updatedAt < :before order by n.updatedAt")
    List<NotificationDelivery> findRetryable(@Param("max") int maxAttempts, @Param("before") Instant before);

    List<NotificationDelivery> findBySubjectTypeAndSubjectId(String subjectType, java.util.UUID subjectId);

    List<NotificationDelivery> findBySubjectTypeAndSubjectIdIn(String subjectType, java.util.Collection<java.util.UUID> subjectIds);
}
