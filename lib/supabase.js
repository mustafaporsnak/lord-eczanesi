import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aigvipbxaakmmraykedv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3ZpcGJ4YWFrbW1yYXlrZWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTY0MDEsImV4cCI6MjA5MDgzMjQwMX0.VIM1IQCd07AelwURIZhZ9rGL2OqS0C6a4RyAy_jbjcI'

export const supabase = createClient(supabaseUrl, supabaseKey)