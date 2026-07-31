import { useNavigate } from 'react-router-dom';
import { Users, User, Store, Shield } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const roles = [
    {
      name: 'Customer',
      path: '/customer',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      description: 'Place orders and track your tea orders'
    },
    {
      name: 'Worker',
      path: '/worker',
      icon: User,
      color: 'from-green-500 to-green-600',
      description: 'Manage and prepare customer orders'
    },
    {
      name: 'Owner',
      path: '/owner',
      icon: Store,
      color: 'from-purple-500 to-purple-600',
      description: 'Manage your shop and business'
    },
    {
      name: 'Super Admin',
      path: '/super-admin/login',
      icon: Shield,
      color: 'from-orange-500 to-orange-600',
      description: 'Platform administration and management'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">TeaFlow</h1>
          <p className="text-xl text-slate-300">Select your role to continue</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.name}
                onClick={() => navigate(role.path)}
                className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-white/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{role.name}</h3>
                  <p className="text-slate-300 text-sm">{role.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
