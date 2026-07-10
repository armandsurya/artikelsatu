import { Mail, MapPin, Phone } from "lucide-react";
import { settings } from "@/data/settings";
import { footer } from "@/data/footer";
import { waLink } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-narrow py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-lg font-bold text-secondary">
              {settings.logo}<span className="text-primary">.</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {footer.description}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />
                <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-secondary">
                  +{settings.whatsapp}
                </a>
              </li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />
                <a href={`mailto:${settings.email}`} className="hover:text-secondary">{settings.email}</a>
              </li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{settings.address}</li>
            </ul>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-secondary">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground hover:text-secondary">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">{settings.copyright}</p>
          <div className="flex gap-4">
            {settings.social.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-secondary">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
