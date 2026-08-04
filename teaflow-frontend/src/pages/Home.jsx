import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">Made by SHA</h1>
      <p className="text-lg text-text-muted mb-8">Seamless ordering and platform management.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/customer" className="bg-accent-warm hover:bg-accent-hover text-white font-semibold py-3 px-6 rounded-xl transition-colors">
          Order Now
        </Link>
        <Link to="/worker" className="bg-carte-white border border-border-warm text-cafe-dark font-semibold py-3 px-6 rounded-xl hover:bg-cafe-cream transition-colors">
          Worker Portal
        </Link>
        <Link to="/owner" className="bg-carte-white border border-border-warm text-cafe-dark font-semibold py-3 px-6 rounded-xl hover:bg-cafe-cream transition-colors">
          Owner Portal
        </Link>
      </div>
    </div>
  );
}