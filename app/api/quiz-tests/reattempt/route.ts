import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type AllowBody = {
  action: "allow";
  quizId: number;
  studentId: number;
  teacherId?: number | null;
};

type RevokeBody = {
  action: "revoke";
  quizId: number;
  studentId: number;
};

type RequestBody = AllowBody | RevokeBody;

function positiveInteger(value: unknown): number | null {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

async function verifyTeacher(teacherId: number | null | undefined) {
  if (!teacherId) {
    return {
      valid: false,
      error: "Teacher ID is required.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    console.error("Teacher verification error:", error);

    return {
      valid: false,
      error: "Unable to verify teacher.",
    };
  }

  if (!data) {
    return {
      valid: false,
      error: "Invalid teacher.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/*
  GET
  Student checks which quizzes currently have an unused
  teacher-authorized re-attempt.

  Example:
  /api/quiz-tests/reattempt?studentId=15
*/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const studentId = positiveInteger(
      searchParams.get("studentId")
    );

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid studentId is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("quiz_reattempt_permissions")
      .select(
        "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
      )
      .eq("student_id", studentId)
      .eq("allowed", true)
      .is("used_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Load re-attempt permissions error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      permissions: data ?? [],
      quizIds: (data ?? []).map((item) => item.quiz_id),
    });
  } catch (error) {
    console.error(
      "GET /api/quiz-tests/reattempt error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load re-attempt permissions.",
      },
      { status: 500 }
    );
  }
}

/*
  POST

  Teacher:
    {
      action: "allow",
      quizId,
      studentId,
      teacherId
    }

  Revoke:
    {
      action: "revoke",
      quizId,
      studentId
    }
*/
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    const quizId = positiveInteger(body.quizId);
    const studentId = positiveInteger(body.studentId);

    if (!quizId || !studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid quizId and studentId are required.",
        },
        { status: 400 }
      );
    }

    /*
      Make sure the quiz exists.
    */
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quiz_tests")
      .select("id, title, is_published")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError) {
      console.error("Quiz lookup error:", quizError);

      return NextResponse.json(
        {
          success: false,
          error: quizError.message,
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz not found.",
        },
        { status: 404 }
      );
    }

    /*
      Make sure the student exists.
    */
    const { data: student, error: studentError } =
      await supabaseAdmin
        .from("students")
        .select("id, student_name, student_username")
        .eq("id", studentId)
        .maybeSingle();

    if (studentError) {
      console.error(
        "Student lookup error:",
        studentError
      );

      return NextResponse.json(
        {
          success: false,
          error: studentError.message,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student not found.",
        },
        { status: 404 }
      );
    }

    /*
      ======================================================
      ALLOW RE-ATTEMPT
      ======================================================
    */
    if (body.action === "allow") {
      const teacherId = positiveInteger(body.teacherId);

      const teacherCheck = await verifyTeacher(teacherId);

      if (!teacherCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: teacherCheck.error,
          },
          { status: 403 }
        );
      }

      /*
        Check whether there is already an unused permission.

        If yes, do not create another duplicate permission.
        This prevents repeated button clicks from creating
        multiple permissions accidentally.
      */
      const { data: existingPermission, error: existingError } =
        await supabaseAdmin
          .from("quiz_reattempt_permissions")
          .select(
            "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
          )
          .eq("quiz_id", quizId)
          .eq("student_id", studentId)
          .eq("allowed", true)
          .is("used_at", null)
          .maybeSingle();

      if (existingError) {
        console.error(
          "Existing permission lookup error:",
          existingError
        );

        return NextResponse.json(
          {
            success: false,
            error: existingError.message,
          },
          { status: 500 }
        );
      }

      if (existingPermission) {
        return NextResponse.json({
          success: true,
          alreadyAllowed: true,
          permission: existingPermission,
          message:
            "Re-attempt is already authorized for this student.",
        });
      }

      /*
        Because the table has a UNIQUE constraint on
        quiz_id + student_id, an old used/revoked permission
        row may already exist.

        Reuse that row instead of inserting a duplicate.
      */
      const { data: previousPermission, error: previousError } =
        await supabaseAdmin
          .from("quiz_reattempt_permissions")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("student_id", studentId)
          .maybeSingle();

      if (previousError) {
        console.error(
          "Previous permission lookup error:",
          previousError
        );

        return NextResponse.json(
          {
            success: false,
            error: previousError.message,
          },
          { status: 500 }
        );
      }

      if (previousPermission) {
        const { data: updatedPermission, error: updateError } =
          await supabaseAdmin
            .from("quiz_reattempt_permissions")
            .update({
              allowed: true,
              used_at: null,
              created_at: new Date().toISOString(),
              created_by: teacherId,
            })
            .eq("id", previousPermission.id)
            .select(
              "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
            )
            .single();

        if (updateError) {
          console.error(
            "Permission update error:",
            updateError
          );

          return NextResponse.json(
            {
              success: false,
              error: updateError.message,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          alreadyAllowed: false,
          permission: updatedPermission,
          message:
            "Re-attempt authorized successfully.",
        });
      }

      /*
        First authorization for this quiz + student.
      */
      const { data: permission, error: insertError } =
        await supabaseAdmin
          .from("quiz_reattempt_permissions")
          .insert({
            quiz_id: quizId,
            student_id: studentId,
            allowed: true,
            used_at: null,
            created_by: teacherId,
          })
          .select(
            "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
          )
          .single();

      if (insertError) {
        console.error(
          "Permission insert error:",
          insertError
        );

        return NextResponse.json(
          {
            success: false,
            error: insertError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyAllowed: false,
        permission,
        message:
          "Re-attempt authorized successfully.",
      });
    }

    /*
      ======================================================
      REVOKE
      ======================================================
    */
    if (body.action === "revoke") {
      const { data: permission, error: permissionError } =
        await supabaseAdmin
          .from("quiz_reattempt_permissions")
          .select("id, used_at")
          .eq("quiz_id", quizId)
          .eq("student_id", studentId)
          .maybeSingle();

      if (permissionError) {
        console.error(
          "Permission lookup error:",
          permissionError
        );

        return NextResponse.json(
          {
            success: false,
            error: permissionError.message,
          },
          { status: 500 }
        );
      }

      if (!permission) {
        return NextResponse.json({
          success: true,
          message: "No active re-attempt permission found.",
        });
      }

      /*
        Do not change a permission that has already been used.
        Used permissions represent a completed authorization
        event and should remain in history.
      */
      if (permission.used_at) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This re-attempt permission has already been used.",
          },
          { status: 409 }
        );
      }

      const { error: revokeError } = await supabaseAdmin
        .from("quiz_reattempt_permissions")
        .update({
          allowed: false,
        })
        .eq("id", permission.id)
        .is("used_at", null);

      if (revokeError) {
        console.error(
          "Revoke permission error:",
          revokeError
        );

        return NextResponse.json(
          {
            success: false,
            error: revokeError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Re-attempt permission revoked.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "POST /api/quiz-tests/reattempt error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process re-attempt permission.",
      },
      { status: 500 }
    );
  }
}