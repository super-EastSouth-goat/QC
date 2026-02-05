# SSO 角色映射配置

## 概述

当用户通过 OIDC 企业登录时，系统会自动从企业身份系统获取用户信息并映射到本地角色。

## 角色层级

系统支持四种角色，权限递增：

1. **worker** (工人) - 基础操作员
2. **supervisor** (主管) - 班组长/主管
3. **engineer** (工程师) - 质量工程师
4. **admin** (管理员) - 系统管理员

## 权限对比

| 功能 | Worker | Supervisor | Engineer | Admin |
|------|--------|------------|----------|-------|
| 拍照质检 | ✅ | ✅ | ✅ | ✅ |
| 查看自己的记录 | ✅ | ✅ | ✅ | ✅ |
| 查看团队记录 | ❌ | ✅ | ✅ | ✅ |
| 查看所有记录 | ❌ | ❌ | ✅ | ✅ |
| 系统配置 | ❌ | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ❌ | ✅ |

## OIDC 角色映射

### 方式一：基于用户组 (推荐)

```javascript
// 从 OIDC 用户信息映射角色
const mapOIDCRole = (oidcUser) => {
  const groups = oidcUser.groups || [];
  
  if (groups.includes('QC_Admin')) return 'admin';
  if (groups.includes('QC_Engineer')) return 'engineer';
  if (groups.includes('QC_Supervisor')) return 'supervisor';
  return 'worker'; // 默认角色
};
```

### 方式二：基于部门和职位

```javascript
const mapOIDCRole = (oidcUser) => {
  const department = oidcUser.department;
  const jobTitle = oidcUser.job_title;
  
  if (jobTitle?.includes('管理员') || jobTitle?.includes('Admin')) {
    return 'admin';
  }
  
  if (department === '质量部' && jobTitle?.includes('工程师')) {
    return 'engineer';
  }
  
  if (jobTitle?.includes('主管') || jobTitle?.includes('Supervisor')) {
    return 'supervisor';
  }
  
  return 'worker';
};
```

### 方式三：基于自定义属性

```javascript
const mapOIDCRole = (oidcUser) => {
  // 假设企业系统有自定义属性 qc_role
  const qcRole = oidcUser.custom_attributes?.qc_role;
  
  const roleMapping = {
    'qc_admin': 'admin',
    'qc_engineer': 'engineer', 
    'qc_supervisor': 'supervisor',
    'qc_worker': 'worker'
  };
  
  return roleMapping[qcRole] || 'worker';
};
```

## 实现配置

### 1. 在 Supabase 中配置角色映射

需要在 Supabase 的 Auth Hook 中实现：

```sql
-- 创建角色映射函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, station)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'qc_role',
      'worker'
    ),
    NEW.raw_user_meta_data->>'station'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. OIDC 配置示例

在企业 OIDC 提供商中配置返回的用户信息：

```json
{
  "sub": "user123",
  "email": "zhang.san@company.com",
  "name": "张三",
  "department": "质量部",
  "job_title": "质检员",
  "groups": ["QC_Worker", "Production_Line_A"],
  "custom_attributes": {
    "qc_role": "worker",
    "station": "工位A01"
  }
}
```

## 动态角色更新

### 用户角色变更处理

```typescript
// 管理员可以更新用户角色
const updateUserRole = async (userId: string, newRole: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (error) throw error;
};
```

### 角色权限检查

```typescript
// 检查用户是否有特定权限
const hasPermission = (userRole: string, requiredRole: string) => {
  const roleHierarchy = {
    'worker': 1,
    'supervisor': 2, 
    'engineer': 3,
    'admin': 4
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
```

## 建议配置

### 初期配置（简单）
- 所有用户默认为 `worker` 角色
- 管理员手动分配特殊角色

### 进阶配置（自动化）
- 基于 OIDC 用户组自动映射角色
- 定期同步企业系统的角色变更

### 企业级配置（完整）
- 多维度角色映射（部门+职位+工位）
- 实时角色同步
- 角色变更审计日志

## 测试建议

1. **创建测试用户**：为每种角色创建测试账户
2. **权限验证**：确认各角色只能访问对应功能
3. **角色切换**：测试角色变更后的权限更新
4. **SSO 集成**：验证 OIDC 登录后的角色映射

需要我帮你实现具体的角色映射逻辑吗？