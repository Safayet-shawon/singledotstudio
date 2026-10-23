/** Renders one or more JSON-LD blocks. "<" is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  const list = Array.isArray(data) ? data : [data];
  return <>{list.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\u003c') }} />)}</>;
}
