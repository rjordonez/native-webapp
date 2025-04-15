export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]


  export type Database = {
    public: {
      Tables: {
        assignments: {
          Row: {
            id: number
            created_at: string | null
            title: string
            questions: string[]
            course_id: string
            due_date: string | null
            topic: string | null
            created_by: string | null
            metadata: Json | null  // Add this line
          }
          Insert: {
            id?: number
            created_at?: string | null
            title: string
            questions: string[]
            course_id: string
            due_date?: string | null
            topic?: string | null
            created_by?: string | null
            metadata?: Json | null  // Add this line
          }
          Update: {
            id?: number
            created_at?: string | null
            title?: string
            questions?: string[]
            course_id?: string
            due_date?: string | null
            topic?: string | null
            created_by?: string | null
            metadata?: Json | null  // Add this line
          }
          Relationships: [
            {
              foreignKeyName: "assignments_course_id_fkey"
              columns: ["course_id"]
              isOneToOne: false
              referencedRelation: "classes"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "assignments_created_by_fkey"
              columns: ["created_by"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        },
        submissions: {
          Row: {
            id: number
            assignment_id: number
            student_id: string
            status: string
            answers: Json
            submitted_at: string | null
            feedback: Json | null
          }
          Insert: {
            id?: number
            assignment_id: number
            student_id: string
            status: string
            answers?: Json
            submitted_at?: string | null
            feedback?: Json | null
          }
          Update: {
            id?: number
            assignment_id?: number
            student_id?: string
            status?: string
            answers?: Json
            submitted_at?: string | null
            feedback?: Json | null
          }
          Relationships: [
            {
              foreignKeyName: "submissions_assignment_id_fkey"
              columns: ["assignment_id"]
              isOneToOne: false
              referencedRelation: "assignments"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "submissions_student_id_fkey"
              columns: ["student_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        },
        classes: {
          Row: {
            class_code: string
            created_at: string | null
            description: string | null
            id: string
            name: string
            teacher_id: string | null
          }
          Insert: {
            class_code: string
            created_at?: string | null
            description?: string | null
            id?: string
            name: string
            teacher_id?: string | null
          }
          Update: {
            class_code?: string
            created_at?: string | null
            description?: string | null
            id?: string
            name?: string
            teacher_id?: string | null
          }
          Relationships: []
        },
        students_classes: {
          Row: {
            class_id: string
            student_id: string
          }
          Insert: {
            class_id: string
            student_id: string
          }
          Update: {
            class_id?: string
            student_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "students_classes_class_id_fkey"
              columns: ["class_id"]
              isOneToOne: false
              referencedRelation: "classes"
              referencedColumns: ["id"]
            },
          ]
        },
        test_reports: {
          Row: {
            audio_errors: Json | null
            created_at: string | null
            error_list: Json | null
            id: string
            student_id: string | null
            title: string
            transcript_parts: Json | null
          }
          Insert: {
            audio_errors?: Json | null
            created_at?: string | null
            error_list?: Json | null
            id?: string
            student_id?: string | null
            title: string
            transcript_parts?: Json | null
          }
          Update: {
            audio_errors?: Json | null
            created_at?: string | null
            error_list?: Json | null
            id?: string
            student_id?: string | null
            title?: string
            transcript_parts?: Json | null
          }
          Relationships: []
        },
        users: {
          Row: {
            created_at: string | null
            email: string
            id: string
            name: string | null
            role: string
          }
          Insert: {
            created_at?: string | null
            email: string
            id?: string
            name?: string | null
            role: string
          }
          Update: {
            created_at?: string | null
            email?: string
            id?: string
            name?: string | null
            role?: string
          }
          Relationships: []
        }
      }
      Views: {
        [_ in never]: never
      }
      Functions: {
        [_ in never]: never
      }
      Enums: {
        [_ in never]: never
      }
      CompositeTypes: {
        [_ in never]: never
      }
    }
  }
  

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
