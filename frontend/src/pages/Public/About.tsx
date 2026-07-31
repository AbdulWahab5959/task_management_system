const benefits = [
  {
    title: 'Save Weeks of Development',
    description: 'Skip the repetitive setup. Authentication, team management, and billing are already built and tested.',
  },
  {
    title: 'Production-Ready Code',
    description: 'Built with best practices, TypeScript, and modern patterns. Deploy with confidence from day one.',
  },
  {
    title: 'Scalable Architecture',
    description: 'Laravel backend with React frontend — a proven stack that scales from prototype to enterprise.',
  },
  {
    title: 'Active Maintenance',
    description: 'Regular updates, security patches, and new features. You focus on your product, we maintain the foundation.',
  },
];

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            About <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">LaunchStack</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            LaunchStack is a modern SaaS boilerplate designed to accelerate your product development.
            We provide the essential infrastructure so you can focus on building your unique value proposition.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Our Mission</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Every SaaS founder knows the drill — months of building authentication, team management, 
                subscription billing, and dashboard UI before you can even start on your actual product.
              </p>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                We built LaunchStack to eliminate that initial grind. Our mission is to give developers a
                production-ready foundation that handles the boring but critical parts of every SaaS application, 
                so you can ship faster and iterate smarter.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-8">
              <div className="text-6xl font-bold text-white">100+</div>
              <div className="mt-2 text-sm text-slate-400">Hours saved per project</div>
              <div className="mt-6 text-6xl font-bold text-white">99.9%</div>
              <div className="mt-2 text-sm text-slate-400">TypeScript coverage</div>
              <div className="mt-6 text-6xl font-bold text-white">10+</div>
              <div className="mt-2 text-sm text-slate-400">Pre-built features</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Why choose LaunchStack?</h2>
            <p className="mt-4 text-lg leading-7 text-slate-300">
              A modern tech stack and thoughtful architecture make LaunchStack the ideal starting point.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/50"
              >
                <h3 className="mb-2 text-lg font-semibold text-white">{benefit.title}</h3>
                <p className="text-sm leading-6 text-slate-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Built with modern technology</h2>
            <p className="mt-4 text-lg leading-7 text-slate-300">
              LaunchStack leverages the best tools in the industry for performance, scalability, and developer experience.
            </p>
          </div>

          <div className="mt-12 grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-lg font-semibold text-white">React 19</div>
              <div className="mt-1 text-sm text-slate-400">Frontend framework</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-lg font-semibold text-white">TypeScript</div>
              <div className="mt-1 text-sm text-slate-400">Type safety</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-lg font-semibold text-white">Laravel</div>
              <div className="mt-1 text-sm text-slate-400">Backend API</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-lg font-semibold text-white">Tailwind CSS</div>
              <div className="mt-1 text-sm text-slate-400">Styling</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
