import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

const AuthComponent = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 border border-gray-800">
        <h1 className="text-2xl font-bold mb-8 text-center">Nutrition Tracker</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              input: {
                background: 'white',
                color: 'black',
                borderRadius: '4px',
                padding: '8px 12px',
              },
              button: {
                background: 'white',
                color: 'black',
                border: '1px solid #e5e7eb',
              },
              label: {
                color: 'white',
              },
              anchor: {
                color: 'white',
              }
            },
          }}
          theme="dark"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Password',
              },
            },
          }}
          providers={['google']}
        />
      </div>
    </div>
  )
}

export default AuthComponent 