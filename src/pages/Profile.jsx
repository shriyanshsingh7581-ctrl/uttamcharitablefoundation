import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Droplet,
  MapPin,
  Calendar,
  Package,
  Sparkles,
  Shield,
  Edit3,
  Camera,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CreditCard,
  Award,
  Wallet,
  Users,
  Check,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Clock,
  ArrowRight,
  Copy,
  ExternalLink,
  Save,
  X
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { rtdb } from '../lib/firebase'
import { ref, update as rtdbUpdate } from 'firebase/database'
import { uploadToCloudinary } from '../lib/cloudinary'
import { useAuth } from '../contexts/AuthContext'
import {
  PACKAGES,
  COMMISSION_RATES,
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  MIN_WITHDRAWAL,
  LEVEL_NAMES
} from '../lib/constants'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import Layout from '../components/layout/Layout'

// Formatting helpers
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch (e) {
    return dateStr
  }
}

const formatINR = (amount) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function Profile() {
  const navigate = useNavigate()
  const authContext = useAuth()
  const { user, member, wallet, loading: authLoading, refreshMember } = authContext

  // Safe signOut / logout resolver
  const handleSignOut = authContext.signOut || authContext.logout || (async () => {
    await supabase.auth.signOut()
    navigate('/login')
  })

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editName, setEditName] = useState('')
  const [editFather, setEditFather] = useState('')
  const [editMother, setEditMother] = useState('')
  const [editDesignation, setEditDesignation] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBloodGroup, setEditBloodGroup] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const fileInputRef = useRef(null)

  // Referrer Info State
  const [referrer, setReferrer] = useState(null)
  const [loadingReferrer, setLoadingReferrer] = useState(false)

  // Password Change State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Toast / Alert
  const [toastMessage, setToastMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [copiedId, setCopiedId] = useState(false)

  // Initialize edit form values when member loads or edit mode opens
  useEffect(() => {
    if (member) {
      setEditFullName(member.full_name || '')
      setEditPhone(member.phone || '')
      setEditBloodGroup(member.blood_group || '')
      setEditAddress(member.address || '')
      setPhotoPreview(member.photo_url || '')
    }
  }, [member, isEditing])

  // Fetch Referrer Details
  useEffect(() => {
    async function fetchReferrerDetails() {
      if (!member?.referrer_id) {
        setReferrer(null)
        return
      }

      setLoadingReferrer(true)
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, member_id, full_name, email, phone, tier_name')
          .or(`id.eq.${member.referrer_id},member_id.eq.${member.referrer_id}`)
          .maybeSingle()

        if (!error && data) {
          setReferrer(data)
        } else {
          setReferrer(null)
        }
      } catch (err) {
        console.warn('Error fetching referrer info:', err)
        setReferrer(null)
      } finally {
        setLoadingReferrer(false)
      }
    }

    if (member?.referrer_id) {
      fetchReferrerDetails()
    }
  }, [member?.referrer_id])

  // Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photo size should not exceed 5MB.')
      setTimeout(() => setErrorMessage(''), 3500)
      return
    }

    setPhotoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
  }

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!member?.id) return

    setIsSaving(true)
    setErrorMessage('')

    try {
      let finalPhotoUrl = member.photo_url

      // If new photo was uploaded, upload to Cloudinary & sync with RTDB
      if (photoFile) {
        try {
          const cloudRes = await uploadToCloudinary(photoFile, 'member_photos');
          if (cloudRes?.secure_url || cloudRes?.url) {
            finalPhotoUrl = cloudRes.secure_url || cloudRes.url;
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload notice (falling back to Supabase):', cloudErr);
          try {
            const fileExt = photoFile.name.split('.').pop()
            const fileName = `${member.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, photoFile, { upsert: true })

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)
              if (publicUrlData?.publicUrl) {
                finalPhotoUrl = publicUrlData.publicUrl
              }
            }
          } catch (storageErr) {
            console.warn('Storage upload fallback error:', storageErr);
          }
        }
      }

      // Sync with Firebase Realtime Database
      const targetUid = member.uid || member.id;
      if (targetUid) {
        try {
          await rtdbUpdate(ref(rtdb, `users/${targetUid}`), {
            photoUrl: finalPhotoUrl,
            avatar_url: finalPhotoUrl,
            name: editFullName.trim(),
            displayName: editFullName.trim(),
            phone: editPhone.trim(),
            bloodGroup: editBloodGroup.trim() || null,
            address: editAddress.trim() || null
          });
        } catch (rtdbErr) {
          console.warn('RTDB profile sync error:', rtdbErr);
        }
      }

      // Update members table
      const updates = {
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        blood_group: editBloodGroup.trim() || null,
        address: editAddress.trim() || null,
        photo_url: finalPhotoUrl,
        updated_at: new Date().toISOString(),
      }

      const { error: updateErr } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member.id)

      if (updateErr) {
        throw updateErr
      }

      // Refresh auth context
      if (typeof refreshMember === 'function') {
        await refreshMember()
      }

      setIsEditing(false)
      setToastMessage('Profile updated successfully / प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!')
      setTimeout(() => setToastMessage(''), 3500)
    } catch (err) {
      console.error('Error updating profile:', err)
      setErrorMessage(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Change Password
  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      setPasswordSuccess('Password changed successfully / पासवर्ड सफलतापूर्वक बदल दिया गया!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4500)
    } catch (err) {
      console.error('Error changing password:', err)
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Copy Member ID
  const handleCopyMemberId = () => {
    const idToCopy = member?.member_id || member?.id
    if (!idToCopy) return
    navigator?.clipboard?.writeText(idToCopy)
    setCopiedId(true)
    setToastMessage(`Copied Member ID: ${idToCopy}`)
    setTimeout(() => setCopiedId(false), 2500)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // User Initials
  const initials = useMemo(() => {
    if (!member?.full_name) return 'U'
    return member.full_name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }, [member?.full_name])

  // Tier Badge Theme
  const tierColor = useMemo(() => {
    const tier = (member?.tier_name || '').toLowerCase()
    if (tier.includes('diamond')) return 'bg-purple-100 text-purple-800 border-purple-300'
    if (tier.includes('platinum')) return 'bg-cyan-100 text-cyan-800 border-cyan-300'
    if (tier.includes('gold')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (tier.includes('silver')) return 'bg-slate-100 text-slate-800 border-slate-300'
    return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }, [member?.tier_name])

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 font-medium">Loading profile details...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-4 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-600/40 text-sm font-medium"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-4 z-50 bg-red-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-red-600/40 text-sm font-medium"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 text-white p-6 sm:p-8 shadow-xl shadow-emerald-900/10 border border-emerald-500/30"
        >
          {/* Subtle Ambient Shapes */}
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Avatar with Camera Icon Overlay */}
              <div className="relative group self-start sm:self-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={member?.full_name || 'Member'}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white/20 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 border-4 border-white/20 text-white font-black text-3xl flex items-center justify-center shadow-xl">
                    {initials}
                  </div>
                )}

                {/* Edit Photo Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-white text-emerald-800 shadow-md flex items-center justify-center hover:bg-emerald-50 transition-all group-hover:scale-105"
                  title="Change profile photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Member Meta */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${tierColor}`}>
                    <Sparkles className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    {member?.tier_name || 'Foundation Member'}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      member?.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                        : member?.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                        : 'bg-red-500/20 text-red-200 border-red-400/30'
                    }`}
                  >
                    {member?.status || 'Active'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {member?.full_name || 'Member Name'}
                </h1>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-100 font-mono">
                  <span>ID: {member?.member_id || member?.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyMemberId}
                    className="text-emerald-300 hover:text-white transition-colors"
                    title="Copy Member ID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-emerald-200/90">
                  Registered: {formatDate(member?.created_at)}
                </p>
              </div>
            </div>

            {/* Edit Profile Toggle Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-5 py-2.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Cancel Editing</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    <span>Edit Profile / प्रोफ़ाइल संपादित करें</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* EDIT PROFILE FORM / PROFILE DETAILS CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence mode="wait">
              {isEditing ? (
                /* EDIT FORM */
                <motion.div
                  key="edit-form"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-md"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                        Edit Personal Information / व्यक्तिगत जानकारी
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Update your personal profile, phone number, and address
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Editing Mode
                    </span>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Full Name / पूरा नाम *
                        </label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          placeholder="Your official full name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Phone Number / फ़ोन नंबर *
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email (Read-only) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Email Address (Associated with Auth)
                        </label>
                        <input
                          type="email"
                          value={member?.email || user?.email || ''}
                          disabled
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed directly</p>
                      </div>

                      {/* Blood Group */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Blood Group / रक्त समूह
                        </label>
                        <select
                          value={editBloodGroup}
                          onChange={(e) => setEditBloodGroup(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="">Select blood group</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Residential Address */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Full Address / पूरा पता
                      </label>
                      <textarea
                        rows={3}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Street, City, District, State, PIN code"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    {/* Form Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                /* READ-ONLY DETAILS CARD */
                <motion.div
                  key="details-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                        Member Details / सदस्यता विवरण
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Official records and credentials registered with the foundation
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* 2x3 Grid of Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Full Name / नाम
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {member?.full_name || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Email Address / ईमेल
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                          {member?.email || user?.email || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Phone / फ़ोन नंबर
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5 font-mono">
                          {member?.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Blood Group */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <Droplet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Blood Group / रक्त समूह
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {member?.blood_group ? (
                            <span className="text-rose-600 font-extrabold">{member.blood_group}</span>
                          ) : (
                            'Not specified'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Joining Date */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Joining Date / पंजीकरण तिथि
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {formatDate(member?.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Package Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                          Foundation Package / पैकेज
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {formatINR(member?.package_amount || 0)}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            ({member?.tier_name || 'Standard'})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="pt-4 border-t border-gray-100 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                        Residential Address / निवास स्थान
                      </span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 leading-relaxed">
                        {member?.address || 'No residential address added yet.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SECURITY & CHANGE PASSWORD CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                      Account Security / सुरक्षा
                    </h3>
                    <p className="text-xs text-gray-500">Change your password or manage credentials</p>
                  </div>
                </div>
              </div>

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    New Password / नया पासवर्ड
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Confirm New Password / पासवर्ड की पुष्टि करें
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  {isUpdatingPassword ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* SIDEBAR: REFERRER INFO, QUICK LINKS & DANGER ZONE */}
          <div className="lg:col-span-4 space-y-6">
            {/* REFERRER CARD */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                  Referred By / स्पॉन्सर जानकारी
                </h4>
              </div>

              {loadingReferrer ? (
                <div className="py-4 text-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : referrer ? (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {(referrer.full_name || 'R')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                        {referrer.full_name}
                      </h5>
                      <p className="text-[11px] font-mono text-emerald-800">
                        ID: {referrer.member_id || referrer.id}
                      </p>
                    </div>
                  </div>
                  {referrer.phone && (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-gray-600">
                      <span>Contact:</span>
                      <span className="font-mono">{referrer.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 text-center">
                  <p className="font-semibold text-gray-700">Direct Foundation Member</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    No individual referrer associated. Directly enrolled with Uttam Welfare Foundation.
                  </p>
                </div>
              )}
            </div>

            {/* QUICK LINKS */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight mb-2">
                Quick Member Links
              </h4>

              <div className="space-y-2">
                {/* ID Card */}
                <Link
                  to="/id-card"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 shadow-sm flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Download ID Card</span>
                      <span className="text-[10px] text-gray-400">आईडी कार्ड डाउनलोड</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Certificates */}
                <Link
                  to="/certificates"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white text-amber-600 shadow-sm flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">View Certificates</span>
                      <span className="text-[10px] text-gray-400">प्रमाण पत्र</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* My Wallet */}
                <Link
                  to="/wallet"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white text-blue-600 shadow-sm flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">My Wallet & Payouts</span>
                      <span className="text-[10px] text-gray-400">वॉलेट और निकासी</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* DANGER ZONE / SIGN OUT */}
            <div className="bg-rose-50/60 rounded-3xl p-5 sm:p-6 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h4 className="text-sm font-bold text-rose-950">
                  Account Session / सत्र समाप्त
                </h4>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Log out of your current session on this device. You will need your login credentials to sign back in.
              </p>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await handleSignOut()
                  } catch (e) {
                    console.error('Logout error:', e)
                    navigate('/login')
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account / लॉग आउट</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export { Profile };
