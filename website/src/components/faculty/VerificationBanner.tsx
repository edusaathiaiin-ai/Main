'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type DocType = 'retirement_letter' | 'pension_slip' | 'appointment_letter' | ''

type Props = {
  userId: string
  employmentStatus: 'active' | 'retired' | 'independent'
  verificationDocUrl: string | null
  verificationStatus: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export function VerificationBanner({
  userId,
  employmentStatus,
  verificationDocUrl,
  verificationStatus,
}: Props) {
  const [docType, setDocType] = useState<DocType>('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(!!verificationDocUrl)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Only show for retired faculty who haven't uploaded yet, OR are still pending
  const shouldShow =
    employmentStatus === 'retired' &&
    (!verificationDocUrl || verificationStatus === 'pending')

  if (!shouldShow || uploaded) return null

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  async function processFile(file: File) {
    setError('')
    if (!docType) {
      setError('Please select a document type before uploading.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPG, or PNG files are accepted.')
      return
    }
    // Validate actual file content via magic numbers (not just extension/MIME)
    const buf = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const isPDF = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
    const isJPG = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
    const isPNG = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
    if (!isPDF && !isJPG && !isPNG) {
      setError('File content does not match a valid PDF, JPG, or PNG.')
      return
    }
    await handleUpload(file)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const supabase = createClient()

    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${userId}/${docType}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('faculty-docs')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    await supabase
      .from('faculty_profiles')
      .update({
        verification_doc_url: path,
        verification_doc_type: docType,
        verification_doc_uploaded_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Notify admin (fire-and-forget)
    fetch('/api/notify-admin-doc-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, docType }),
    }).catch(() => {
      /* non-critical */
    })

    setUploaded(true)
    setUploading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        margin: '0 0 20px',
        padding: '16px 20px',
        background: 'rgba(201,153,58,0.08)',
        border: '1px solid rgba(201,153,58,0.35)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '24px', flexShrink: 0 }}>📋</span>

      <div style={{ flex: 1, minWidth: '260px' }}>
        <p
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#C9993A',
            margin: '0 0 4px',
          }}
        >
          Complete your Emeritus verification
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 14px',
            lineHeight: 1.6,
          }}
        >
          Upload one document to verify your faculty credentials. Accepted:
          retirement letter, pension slip, or last appointment letter. Admin
          reviews within 48 hours. Until then your profile shows &quot;Pending
          Verification.&quot;
        </p>

        {error && (
          <p
            style={{ fontSize: '12px', color: '#F87171', marginBottom: '10px' }}
          >
            ⚠ {error}
          </p>
        )}

        {/* Doc type selector — must be chosen before upload */}
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: docType ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: '12px',
            outline: 'none',
            width: '100%',
            marginBottom: '10px',
          }}
        >
          <option value="">Select document type first</option>
          <option value="retirement_letter">
            Retirement / Superannuation Letter
          </option>
          <option value="pension_slip">Pension Slip</option>
          <option value="appointment_letter">Last Appointment Letter</option>
        </select>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed rgba(201,153,58,${docType ? '0.5' : '0.2'})`,
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            cursor: docType ? 'pointer' : 'not-allowed',
            background: `rgba(201,153,58,${docType ? '0.04' : '0.01'})`,
            opacity: docType ? 1 : 0.5,
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={!docType}
          />
          {uploading ? (
            <p style={{ fontSize: '13px', color: '#C9993A', margin: 0 }}>
              Uploading...
            </p>
          ) : (
            <>
              <p style={{ fontSize: '20px', margin: '0 0 6px' }}>📄</p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: 0,
                }}
              >
                {docType
                  ? 'Drop file here or click to browse'
                  : 'Select document type above first'}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.25)',
                  margin: '4px 0 0',
                }}
              >
                PDF, JPG or PNG · Max 5 MB
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
