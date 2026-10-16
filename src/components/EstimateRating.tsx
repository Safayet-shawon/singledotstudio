'use client';
import { useState } from 'react';
import PeekRating from './reactbits/PeekRating';
import './EstimateRating.css';

const labels = ['Not helpful', 'A little helpful', 'Helpful', 'Very helpful', 'Extremely helpful'];

/**
 * Optional "how useful was this estimate" rating (React Bits PeekRating).
 * The value lives only in this component's state: nothing is stored or sent anywhere, and the text says so.
 */
export function EstimateRating() {
  const [value, setValue] = useState(0);
  return (
    <div className="estimate-rating">
      <span className="label" id="est-rate-l">How useful was this estimate?</span>
      <PeekRating
        count={5}
        shape="star"
        labels={labels}
        value={value}
        onChange={setValue}
        allowClear
        size={30}
        activeColor="#b3683e"
        idleColor="rgba(38, 35, 31, 0.22)"
        tipColor="#26231f"
        tipTextColor="#f7f2e9"
        ariaLabel="Rate how useful this estimate was"
      />
      <p className="hint" role="status">{value ? `You chose “${labels[value - 1]}”. This stays in your browser; it is not saved or sent to the studio yet.` : 'Optional. Your choice is not saved or sent anywhere.'}</p>
    </div>
  );
}
