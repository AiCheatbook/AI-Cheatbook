type JsonLdProps = {
  data: object | object[];
};

export default function JsonLd({
  data,
}: JsonLdProps) {
  const items = Array.isArray(data)
    ? data
    : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              item
            ).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />
      ))}
    </>
  );
}
