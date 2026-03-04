interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export default function ResourceCard({ resource, onTagClick }: { resource: Resource; onTagClick?: (tag: string) => void }) {
  const domain = new URL(resource.url).hostname.replace("www.", "");
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-card">
      <img
        src={faviconUrl}
        alt=""
        className="resource-favicon"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <h3>{resource.title}</h3>
      <span className="domain">{domain}</span>
      {resource.tags.length > 0 && (
        <div className="tags">
          {resource.tags.map((tag) => (
            <button
              key={tag}
              className="tag"
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </a>
  );
}
