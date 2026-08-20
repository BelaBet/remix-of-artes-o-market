import { useEffect } from "react";

type SEOProps = {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
};

const SITE_NAME = "Feito à Mão — Artesanato Brasileiro";
const DEFAULT_DESCRIPTION =
  "Marketplace de artesanato brasileiro autoral. Peças únicas, feitas à mão, direto de quem cria.";
const DEFAULT_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/65a2242a-8498-467d-8d18-8835689aa4c1/id-preview-117b313b--850880c4-7411-4de3-9bbe-92ef52e58415.lovable.app-1778775086926.png";

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

const SEO = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  path,
  noindex = false,
}: SEOProps) => {
  useEffect(() => {
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = new URL(canonicalPath || "/", window.location.origin).href;

    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large",
    });

    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "pt_BR" });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: DEFAULT_IMAGE });

    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: DEFAULT_IMAGE });

    upsertLink("canonical", canonicalUrl);
  }, [title, description, path, noindex]);

  return null;
};

export default SEO;
