import React from 'react';
import { Copyright, Info, DraftingCompass, Package, CircleQuestionMark, ExternalLink, Mail, Shield, Code, Database, Server } from 'lucide-react';

export default function About() {
  const licenses = [
    {
      name: "Angie Server License",
      url: "https://angie.software/en/license/",
      icon: Server,
      desc: "High-performance server"
    },
    {
      name: "MariaDB License",
      url: "https://mariadb.org/about/license/",
      icon: Database,
      desc: "SQL relational database"
    },
    {
      name: "PHP License",
      url: "https://www.php.net/license/",
      icon: Code,
      desc: "General scripting language"
    },
    {
      name: "mkcert BSD-3 License",
      url: "https://github.com/FiloSottile/mkcert/blob/master/LICENSE",
      icon: Shield,
      desc: "Certificate command-line"
    },
    {
      name: "Mailpit MIT License",
      url: "https://github.com/axllent/mailpit/blob/develop/LICENSE",
      icon: Mail,
      desc: "Email and SMTP testing"
    },
    {
      name: "Neutralino.js MIT License",
      url: "https://github.com/neutralinojs/neutralinojs/blob/main/LICENSE",
      icon: Code,
      desc: "Cross-platform desktop"
    },
    {
      name: "Other MIT License",
      url: "#",
      icon: Code,
      desc: "Vite, Recharts, React Flow"
    },
    {
      name: "AMP MIT License",
      url: "https://github.com/gigamaster/amp",
      icon: Code,
      desc: "Amp Tasks & Manager UI"
    }
  ];

  const faqs = [
    { q: "What is AMP Manager?",
      a: "AMP Manager is a lightweight desktop manager for local development stacks. It runs your services in Docker containers, with config, data, and www directories bind‑mounted to your host for seamless IDE integration and portable workflows."
    },
    {
      q: "What can I do with AMP?",
      a: "AMP Manager helps you manage your local development stack (Angie, MariaDB, PHP) using Docker. It automates domain scanning, SSL certificate generation with mkcert, and configuration management."
    },
    {
      q: "Do I need Docker Desktop?",
      a: "Yes — AMP uses Docker Desktop (or Docker Engine) as its runtime. AMP manages your stack; Docker runs the containers."
    },
    {
      q: "Where are my files stored?",
      a: "All config, data, and project code live in /amp-manager on your host drive. They’re bind‑mounted into the containers for real‑time editing."
    },
    {
      q: "Can I use my own local domains?",
      a: "AMP Manager automates the creation of your own Certificate Authority (CA) for local domains. This gives you real HTTPS on your .local domains without browser warnings."
    },
    {
      q: "How does it handle SSL?",
      a: "Create a new domain and `mkcert` generates a local trusted certificate, along with Angie web‑server configuration and HOSTS entries, stored in /config/ of your AMP Manager."
    },
    {
      q: "Why AMP Manager automatically generates my SSH key?",
      a: "The key is stored only on your computer, and the private key is encrypted using your AMP Manager login. This can be used to authenticate to a remote server as long as the server has your public key."
    },
    {
      q: "Is storing credentials in AMP Manager safe?",
      a: "Yes — your credentials are encrypted locally using your AMP Manager login. The data never leaves your machine and cannot be accessed by other apps or websites. This process is fully automatic, secure, and designed to enable a secure integration with your workflows."
    },
    {
      q: "Is AMP Manager a deployment platform?",
      a: "AMP Manager is built to make local development with Docker easier — fast setup, clean isolation, automatic SSL, and seamless host‑mounted code with features like workflow. Use proper deployment tooling to handle multiple environments."
    },
    {
      q: "Is AMP Manager safe for production?",
      a: "Production environments involve scaling, security hardening, monitoring, backups, and global availability. These responsibilities are best handled with dedicated tools and trusted service providers."
    }
  ];

  return (
    <div className="min-h-screen bg-base-300/50 rounded-xl">
      {/* Hero Section */}
      <div className="hero bg-base-100 py-12 border-b border-base-300 rounded-t-xl">
        <div className="hero-content flex-col lg:flex-row gap-12 max-w-6xl">
          <div className="relative">
            <div className="z-[1] w-64 h-64 bg-primary/10 rounded-3xl flex items-center justify-center rotate-3 border-2 border-primary/20">
              <Info className="w-32 h-32 text-primary -rotate-3" />
            </div>
            <div className="absolute z-[2] -top-3 -right-4 w-24 h-24 bg-blue-500/30 rounded-2xl flex items-center justify-center rotate-10 border-2 border-blue-500/50">
              <DraftingCompass className="w-12 h-12 text-blue-500 rotate-6" />
            </div>
            <div className="absolute z-[3] -bottom-4 -right-4 w-24 h-24 bg-indigo-600/30 rounded-2xl flex items-center justify-center -rotate-6 border-2 border-indigo-600/50">
              <Package className="w-12 h-12 text-indigo-500 rotate-6" />
            </div>
          </div>
          <div className="text-center lg:text-left">
            <h1 className="text-5xl text-primary text-shadow-lg/30">Amp Manager</h1>
            <p className="py-6 text-md opacity-80">
              Your personal local dev stack manager. Predictable, high-performance, and built for developers who value <strong>privacy</strong> and <strong>simplicity</strong>.
            </p>
            <p className="mb-8">Local-first · No telemetry · Offline capable</p>
            <div className="flex gap-4 justify-center lg:justify-start">
              <a
              className="btn btn-primary"
/*               onClick={() => {
                window.open("https://github.com/gigamaster/amp/", "_blank");
              }} */
              href="#help"
              >Common Questions</a>
              <a
              className="btn btn-soft"
/*               onClick={() => {
                window.open("https://github.com/gigamaster/amp/docs", "_blank");
              }} */
             href="#licenses"
              >Open Source Licenses</a>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section and Licenses */}
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* FAQ Section */}
        <section id="help">
          <h2 className="text-2xl mb-8 flex items-center gap-4">
            <CircleQuestionMark className="w-7 h-7 text-primary" /> Questions & Answers
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-xl">
                <input type="radio" name="my-accordion-2" defaultChecked={i === 0} /> 
                <div className="collapse-title text-md font-medium p-4">
                  {faq.q}
                </div>
                <div className="collapse-content text-sm opacity-70"> 
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Licenses Grid */}
        <section id="licenses">
          <h2 className="text-2xl mb-8 flex items-center gap-4">
            <Copyright className="w-7 h-7 text-primary" /> Licenses & Credits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {licenses.map((lib, i) => (
              <div key={i} className="card bg-base-100 shadow-md border border-base-300 hover:border-primary/50 transition-colors">
                <div className="card-body p-4">
                  <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center mb-2">
                    <lib.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="card-title text-sm">{lib.name}</h3>
                  <p className="text-xs opacity-60">{lib.desc}</p>
                  <div className="card-actions justify-end">
                    <a 
                      href={lib.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-8 bg-base-100 text-base-content border-b border-base-300 rounded-b-xl">
        <aside>
          <div className="flex items-center gap-2 text-xl font-bold text-primary text-shadow-lg/30 mb-2">
            AMP Manager
          </div>
          <p className="flex items-center">
             Local development made simple.
          </p>
          <p className="text-xs opacity-70 mt-2">© 2026 Nuno Luciano.<br /> Amp Manager is licensed under the MIT License.</p>
        </aside>
      </footer>
    </div>
  );
}
