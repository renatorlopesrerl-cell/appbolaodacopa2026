import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export const ConfirmacaoCadastro: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    setTimeout(() => {
      navigate("/login")
    }, 3000)
  }, [navigate])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f9fafb"
    }}>
      <div style={{
        background: "#fff",
        padding: "40px",
        borderRadius: "12px",
        textAlign: "center",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      }}>
        <img
          src="https://sjianpqzozufnobftksp.supabase.co/storage/v1/object/public/Public/palpiteirodacopa2026.png"
          width={150}
          alt="Logo"
          style={{ marginBottom: '20px', display: 'inline-block' }}
        />

        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#111827', 
          marginBottom: '10px' 
        }}>
          Cadastro confirmado 🎉
        </h2>

        <p style={{ 
          color: '#4b5563', 
          lineHeight: '1.5' 
        }}>
          Seu cadastro foi confirmado com sucesso.<br/>
          Você será redirecionado para o login.
        </p>
      </div>
    </div>
  )
}
