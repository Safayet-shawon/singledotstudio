package com.singledotstudio.consultations;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    @Query("select c from Consultation c where c.fingerprint = :fp and c.createdAt >= :since order by c.createdAt desc")
    List<Consultation> findRecentByFingerprint(@Param("fp") String fingerprint, @Param("since") Instant since);

    Page<Consultation> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
