const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const envContent = fs.readFileSync(".env", "utf-8");
const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/SUPABASE_SECRET_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.log("❌ 无法读取 SUPABASE_URL 或 SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function main() {
  const phone = "13968618333";
  
  console.log(`🔍 查找用户 ${phone}...`);
  
  // 方法1: 通过 users 表查询
  const { data: users, error } = await supabase
    .from("users")
    .select("id, phone, email, ai_chat_count, nickname")
    .eq("phone", phone)
    .limit(1);
  
  let userId = null;
  let currentCredits = 0;
  
  if (!error && users && users.length > 0) {
    userId = users[0].id;
    currentCredits = users[0].ai_chat_count || 0;
    console.log("✅ 找到用户:");
    console.log(`   ID: ${userId}`);
    console.log(`   手机号: ${users[0].phone}`);
    console.log(`   昵称: ${users[0].nickname || "未设置"}`);
    console.log(`   当前积分: ${currentCredits}`);
  } else {
    console.log("⚠️ users 表中未找到，尝试 auth.users...");
    
    // 方法2: 通过 auth.users 查询
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData?.users?.find(u => 
      u.user_metadata?.phone === phone || 
      u.email === `user_${phone}@mingai.fun`
    );
    
    if (user) {
      userId = user.id;
      console.log("✅ 在 Auth 中找到用户:");
      console.log(`   ID: ${userId}`);
      console.log(`   Email: ${user.email}`);
      
      // 获取当前积分
      const { data: userData } = await supabase
        .from("users")
        .select("ai_chat_count")
        .eq("id", userId)
        .single();
      
      currentCredits = userData?.ai_chat_count || 0;
      console.log(`   当前积分: ${currentCredits}`);
    } else {
      console.log(`❌ 未找到手机号 ${phone} 的用户`);
      process.exit(1);
    }
  }
  
  if (!userId) {
    console.log("❌ 无法获取用户 ID");
    process.exit(1);
  }
  
  // 增加积分
  const amount = 500;
  console.log(`\n💰 增加 ${amount} 积分...`);
  
  const { error: incError } = await supabase
    .rpc("increment_ai_chat_count", {
      user_id: userId,
      amount: amount
    });
  
  if (incError) {
    console.log("❌ 增加积分失败:", incError.message);
    process.exit(1);
  }
  
  // 记录交易日志
  const { error: logError } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: userId,
      amount: amount,
      type: "earn",
      source: "admin_manual",
      description: `管理员手动增加 ${amount} 积分`
    });
  
  if (logError) {
    console.log("⚠️ 交易日志记录失败:", logError.message);
  }
  
  // 验证最终积分
  const { data: finalData } = await supabase
    .from("users")
    .select("ai_chat_count")
    .eq("id", userId)
    .single();
  
  const finalCredits = finalData?.ai_chat_count || 0;
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ 积分增加成功！");
  console.log("=".repeat(50));
  console.log(`   用户: ${phone}`);
  console.log(`   原积分: ${currentCredits}`);
  console.log(`   增加: +${amount}`);
  console.log(`   现积分: ${finalCredits}`);
  console.log("=".repeat(50));
}

main().catch(err => {
  console.error("❌ 异常:", err.message);
  process.exit(1);
});
