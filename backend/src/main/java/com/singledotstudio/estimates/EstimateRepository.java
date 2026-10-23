package com.singledotstudio.estimates;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstimateRepository extends JpaRepository<Estimate, UUID> {

    @Query("select e from Estimate e where e.fingerprint = :fp and e.createdAt >= :since order by e.createdAt desc")
    List<Estimate> findRecentByFingerprint(@Param("fp") String fingerprint, @Param("since") Instant since);

    @EntityGraph(attributePaths = "items")
    @Query("select e from Estimate e where e.id = :id")
    Optional<Estimate> findWithItems(@Param("id") UUID id);

    Page<Estimate> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
