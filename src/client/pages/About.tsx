import { useState, useEffect } from "react";
import type { Profile } from "../../shared/types.ts";

export function About() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json() as Promise<Profile>)
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  if (!profile) {
    return (
      <main className="main">
        <div className="container">
          <p className="text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container">
        <div className="profile-card">
          <h1 className="profile-card__name">{profile.name}</h1>
          <p className="profile-card__bio">{profile.bio}</p>
          <div className="profile-card__socials">
            {profile.socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                className="btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.name.toLowerCase()}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
