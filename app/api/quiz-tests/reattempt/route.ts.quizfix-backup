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

type AllowAllItem = {
  quizId: number;
  studentId: number;
};

type AllowAllBody = {
  action: "allow_all";
  items: AllowAllItem[];
  teacherId?: number | null;
};

type RevokeBody = {
  action: "revoke";
  quizId: number;
  studentId: number;
};

type RequestBody =
  | AllowBody
  | AllowAllBody
  | RevokeBody;

function positiveInteger(value: unknown): number | null {
  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

async function verifyTeacher(
  teacherId: number | null | undefined
) {
  if (!teacherId) {
    return {
      valid: false,
      error: "Teacher ID is required.",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    console.error(
      "Teacher verification error:",
      error
    );

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

function normalizePairs(
  items: unknown
): AllowAllItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const unique = new Map<
    string,
    AllowAllItem
  >();

  for (const item of items) {
    const quizId =
      positiveInteger(
        (item as AllowAllItem)?.quizId
      );

    const studentId =
      positiveInteger(
        (item as AllowAllItem)?.studentId
      );

    if (!quizId || !studentId) {
      continue;
    }

    const key =
      `${quizId}__${studentId}`;

    if (!unique.has(key)) {
      unique.set(key, {
        quizId,
        studentId,
      });
    }
  }

  return [...unique.values()];
}

/*
 * GET
 *
 * Student checks which quizzes have an active,
 * unused teacher-authorized re-attempt.
 *
 * Optional:
 * ?studentId=15
 *
 * Exact quiz:
 * ?studentId=15&quizId=8
 */
export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const studentId =
      positiveInteger(
        searchParams.get("studentId")
      );

    const quizIdParam =
      searchParams.get("quizId");

    const quizId =
      quizIdParam
        ? positiveInteger(
            quizIdParam
          )
        : null;

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid studentId is required.",
        },
        { status: 400 }
      );
    }

    let query =
      supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .select(
          "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
        )
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "allowed",
          true
        )
        .is(
          "used_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (quizId) {
      query = query.eq(
        "quiz_id",
        quizId
      );
    }

    const {
      data,
      error,
    } = await query;

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

    const permissions =
      data || [];

    return NextResponse.json({
      success: true,
      allowed:
        permissions.length > 0,
      permissions,
      quizIds:
        permissions.map(
          (item) =>
            Number(item.quiz_id)
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/quiz-tests/reattempt error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load re-attempt permissions.",
      },
      { status: 500 }
    );
  }
}

/*
 * POST
 *
 * ALLOW:
 * {
 *   action: "allow",
 *   quizId,
 *   studentId,
 *   teacherId
 * }
 *
 * ALLOW ALL:
 * {
 *   action: "allow_all",
 *   items: [
 *     { quizId, studentId },
 *     ...
 *   ],
 *   teacherId
 * }
 *
 * REVOKE:
 * {
 *   action: "revoke",
 *   quizId,
 *   studentId
 * }
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    /*
     * ======================================================
     * ALLOW ALL
     * ======================================================
     */

    if (
      body.action ===
      "allow_all"
    ) {
      const teacherId =
        positiveInteger(
          body.teacherId
        );

      const teacherCheck =
        await verifyTeacher(
          teacherId
        );

      if (!teacherCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error:
              teacherCheck.error,
          },
          { status: 403 }
        );
      }

      const items =
        normalizePairs(
          body.items
        );

      if (
        items.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No valid quiz/student records were supplied.",
          },
          { status: 400 }
        );
      }

      /*
       * We validate every exact quiz/student pair separately.
       * Therefore Allow All does NOT create a global permission.
       */

      const quizIds = [
        ...new Set(
          items.map(
            (item) =>
              item.quizId
          )
        ),
      ];

      const studentIds = [
        ...new Set(
          items.map(
            (item) =>
              item.studentId
          )
        ),
      ];

      const {
        data: quizzes,
        error: quizzesError,
      } = await supabaseAdmin
        .from("quiz_tests")
        .select(
          "id, title, scheduled_date, is_published"
        )
        .in(
          "id",
          quizIds
        );

      if (quizzesError) {
        console.error(
          "Allow all quiz lookup error:",
          quizzesError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              quizzesError.message,
          },
          { status: 500 }
        );
      }

      const quizSet =
        new Set(
          (quizzes || []).map(
            (quiz) =>
              Number(quiz.id)
          )
        );

      const {
        data: students,
        error: studentsError,
      } = await supabaseAdmin
        .from("students")
        .select(
          "id"
        )
        .in(
          "id",
          studentIds
        );

      if (studentsError) {
        console.error(
          "Allow all student lookup error:",
          studentsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              studentsError.message,
          },
          { status: 500 }
        );
      }

      const studentSet =
        new Set(
          (students || []).map(
            (student) =>
              Number(student.id)
          )
        );

      const validItems =
        items.filter(
          (item) =>
            quizSet.has(
              item.quizId
            ) &&
            studentSet.has(
              item.studentId
            )
        );

      if (
        validItems.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No valid quiz/student records were found.",
          },
          { status: 404 }
        );
      }

      /*
       * Load existing permissions.
       *
       * The query can return combinations beyond the exact requested
       * pairs because Supabase .in() clauses are independent.
       * We therefore use an exact pair map below.
       */
      const validQuizIds = [
        ...new Set(
          validItems.map(
            (item) =>
              item.quizId
          )
        ),
      ];

      const validStudentIds = [
        ...new Set(
          validItems.map(
            (item) =>
              item.studentId
          )
        ),
      ];

      const {
        data: existingPermissions,
        error: existingPermissionsError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .select(
          "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
        )
        .in(
          "quiz_id",
          validQuizIds
        )
        .in(
          "student_id",
          validStudentIds
        );

      if (
        existingPermissionsError
      ) {
        console.error(
          "Allow all existing permission lookup error:",
          existingPermissionsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              existingPermissionsError.message,
          },
          { status: 500 }
        );
      }

      const permissionMap =
        new Map<
          string,
          any
        >();

      (
        existingPermissions ||
        []
      ).forEach(
        (permission) => {
          const key =
            `${Number(
              permission.quiz_id
            )}__${Number(
              permission.student_id
            )}`;

          /*
           * There should normally be one row because the table is
           * expected to have a unique quiz_id + student_id constraint.
           */
          permissionMap.set(
            key,
            permission
          );
        }
      );

      const rowsToUpdate: number[] =
        [];

      const rowsToInsert: Array<{
        quiz_id: number;
        student_id: number;
        allowed: boolean;
        used_at: string | null;
        created_by: number;
      }> = [];

      const allowedPairs: string[] =
        [];

      const alreadyAllowedPairs: string[] =
        [];

      const usedPairs: string[] =
        [];

      for (
        const item of validItems
      ) {
        const key =
          `${item.quizId}__${item.studentId}`;

        const existing =
          permissionMap.get(
            key
          );

        /*
         * IMPORTANT:
         * Once used_at has a value, this permission can NEVER be reset.
         * This is the one-reattempt lock.
         */
        if (
          existing?.used_at
        ) {
          usedPairs.push(
            key
          );
          continue;
        }

        if (
          existing?.allowed
        ) {
          alreadyAllowedPairs.push(
            key
          );
          allowedPairs.push(
            key
          );
          continue;
        }

        if (existing) {
          rowsToUpdate.push(
            Number(
              existing.id
            )
          );

          allowedPairs.push(
            key
          );

          continue;
        }

        rowsToInsert.push({
          quiz_id:
            item.quizId,
          student_id:
            item.studentId,
          allowed: true,
          used_at: null,
          created_by:
            Number(
              teacherId
            ),
        });

        allowedPairs.push(
          key
        );
      }

      /*
       * Reactivate only an unused/revoked permission.
       */
      if (
        rowsToUpdate.length > 0
      ) {
        const {
          error:
            updateError,
        } = await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .update({
            allowed: true,
            created_at:
              new Date().toISOString(),
            created_by:
              Number(
                teacherId
              ),
          })
          .in(
            "id",
            rowsToUpdate
          )
          .is(
            "used_at",
            null
          );

        if (updateError) {
          console.error(
            "Allow all update error:",
            updateError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                updateError.message,
            },
            { status: 500 }
          );
        }
      }

      /*
       * Create first-time permissions.
       */
      if (
        rowsToInsert.length > 0
      ) {
        const {
          error:
            insertError,
        } = await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .insert(
            rowsToInsert
          );

        if (insertError) {
          console.error(
            "Allow all insert error:",
            insertError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                insertError.message,
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        action:
          "allow_all",
        totalRequested:
          validItems.length,
        allowedCount:
          allowedPairs.length,
        alreadyAllowedCount:
          alreadyAllowedPairs.length,
        skippedUsedCount:
          usedPairs.length,
        allowedPairs,
        alreadyAllowedPairs,
        skippedUsedPairs:
          usedPairs,
        message:
          "Re-attempt permission was applied separately to each selected quiz/date/student record. Previously used re-attempts were not reset.",
      });
    }

    /*
     * ======================================================
     * NORMAL ALLOW / REVOKE
     * ======================================================
     */

    const quizId =
      positiveInteger(
        body.quizId
      );

    const studentId =
      positiveInteger(
        body.studentId
      );

    if (
      !quizId ||
      !studentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid quizId and studentId are required.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate quiz.
     */
    const {
      data: quiz,
      error: quizError,
    } = await supabaseAdmin
      .from("quiz_tests")
      .select(
        "id, title, scheduled_date, scheduled_time, is_published"
      )
      .eq(
        "id",
        quizId
      )
      .maybeSingle();

    if (quizError) {
      console.error(
        "Quiz lookup error:",
        quizError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            quizError.message,
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Validate student.
     */
    const {
      data: student,
      error: studentError,
    } =
      await supabaseAdmin
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .eq(
          "id",
          studentId
        )
        .maybeSingle();

    if (studentError) {
      console.error(
        "Student lookup error:",
        studentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            studentError.message,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Student not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ======================================================
     * ALLOW
     * ======================================================
     */

    if (
      body.action ===
      "allow"
    ) {
      const teacherId =
        positiveInteger(
          body.teacherId
        );

      const teacherCheck =
        await verifyTeacher(
          teacherId
        );

      if (!teacherCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error:
              teacherCheck.error,
          },
          { status: 403 }
        );
      }

      const {
        data: existingPermission,
        error: existingPermissionError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .select(
          "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
        )
        .eq(
          "quiz_id",
          quizId
        )
        .eq(
          "student_id",
          studentId
        )
        .maybeSingle();

      if (
        existingPermissionError
      ) {
        console.error(
          "Existing permission lookup error:",
          existingPermissionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              existingPermissionError.message,
          },
          { status: 500 }
        );
      }

      /*
       * IMPORTANT:
       *
       * used_at != null means the student has already consumed
       * the re-attempt permission.
       *
       * It must NEVER be reset.
       */
      if (
        existingPermission?.used_at
      ) {
        return NextResponse.json(
          {
            success: false,
            alreadyUsed: true,
            error:
              "This re-attempt has already been used. A second re-attempt cannot be authorized for the same quiz/date.",
          },
          { status: 409 }
        );
      }

      /*
       * Already active.
       */
      if (
        existingPermission?.allowed
      ) {
        return NextResponse.json({
          success: true,
          alreadyAllowed: true,
          permission:
            existingPermission,
          message:
            "Re-attempt is already authorized for this student and quiz.",
        });
      }

      /*
       * Reactivate only an unused/revoked permission.
       */
      if (
        existingPermission
      ) {
        const {
          data:
            updatedPermission,
          error:
            updateError,
        } = await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .update({
            allowed: true,
            created_at:
              new Date().toISOString(),
            created_by:
              teacherId,
          })
          .eq(
            "id",
            existingPermission.id
          )
          .is(
            "used_at",
            null
          )
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
              error:
                updateError.message,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          alreadyAllowed: false,
          permission:
            updatedPermission,
          message:
            "Re-attempt authorized successfully.",
        });
      }

      /*
       * First authorization.
       */
      const {
        data: permission,
        error: insertError,
      } =
        await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .insert({
            quiz_id:
              quizId,
            student_id:
              studentId,
            allowed: true,
            used_at:
              null,
            created_by:
              teacherId,
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
            error:
              insertError.message,
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
     * ======================================================
     * REVOKE
     * ======================================================
     */

    if (
      body.action ===
      "revoke"
    ) {
      const {
        data: permission,
        error: permissionError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .select(
          "id, used_at, allowed"
        )
        .eq(
          "quiz_id",
          quizId
        )
        .eq(
          "student_id",
          studentId
        )
        .maybeSingle();

      if (permissionError) {
        console.error(
          "Permission lookup error:",
          permissionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              permissionError.message,
          },
          { status: 500 }
        );
      }

      if (!permission) {
        return NextResponse.json({
          success: true,
          message:
            "No re-attempt permission found.",
        });
      }

      /*
       * Never revoke/change an already-used permission.
       */
      if (
        permission.used_at
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This re-attempt permission has already been used and cannot be revoked.",
          },
          { status: 409 }
        );
      }

      const {
        error: revokeError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .update({
          allowed: false,
        })
        .eq(
          "id",
          permission.id
        )
        .is(
          "used_at",
          null
        );

      if (revokeError) {
        console.error(
          "Revoke permission error:",
          revokeError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              revokeError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Re-attempt permission revoked.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid action.",
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
        error:
          "Unable to process re-attempt permission.",
      },
      { status: 500 }
    );
  }
}