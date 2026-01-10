# Guest User Invitation UX Improvement

## Issue
In the Create Project page, guest users could see the team member invitation interface, but:
- The disabled state was not visually clear in light mode
- No explanation was provided that this feature requires a real account
- The UI made it unclear that guest users cannot invite team members

## Solution Implemented

### 1. **Guest User Detection Banner**
Added a prominent warning banner specifically for guest users:
- **Background**: Orange/warning color (`bg-orange-2`) with dark text for better visibility in light mode
- **Icon**: Lock icon to indicate restricted feature
- **Message**: "Team invitations are not available for guest users."
- **Explanation**: Clear caption explaining they need to sign up
- **Call-to-Action**: "Sign Up Free" button directing to registration

### 2. **Input Field Improvements**
- **Disabled State**: Email input is disabled for guest users
- **Visual Feedback**: Better disabled styling in light mode (gray background, reduced opacity)
- **Hint Text**: Shows "Sign up to invite team members" when disabled for guests

### 3. **Button Improvements**
- **Disabled State**: Invite button is disabled for guest users
- **Tooltip**: Shows "Sign up for a free account to invite team members" on hover
- **Better Visibility**: Enhanced disabled button styling in light mode

### 4. **Light Mode Styling Enhancements**
Added custom CSS for better disabled state visibility:
```scss
:global(.body--light) {
  .q-field--disabled {
    opacity: 0.6;
    background-color: #f5f5f5;
    label color: #9e9e9e;
  }

  .q-btn[disabled] {
    opacity: 0.5;
    background-color: #e0e0e0;
    color: #9e9e9e;
  }
}
```

## Changes Made

### File: `/apps/web/src/pages/app/CreateProjectPage.vue`

#### 1. Added Guest User Detection
```typescript
// Check if user is a guest
const isGuestUser = computed(() => {
  return authStore.user?.isGuest === true
})
```

#### 2. Conditional Warning Banner
```vue
<!-- Guest User Warning -->
<q-banner v-if="isGuestUser" class="bg-orange-2 text-grey-9 q-mb-md" rounded>
  <template #avatar>
    <q-icon name="lock" color="warning" />
  </template>
  <div class="text-body2">
    <strong>Team invitations are not available for guest users.</strong>
    <div class="text-caption q-mt-xs">
      Please sign up for a free account to invite team members and collaborate on projects.
    </div>
  </div>
  <template #action>
    <q-btn
      flat
      dense
      label="Sign Up Free"
      color="warning"
      @click="router.push('/register')"
    />
  </template>
</q-banner>
```

#### 3. Updated Input Disable Logic
```vue
<q-input
  v-model="newMemberEmail"
  label="Email Address"
  outlined
  dense
  type="email"
  :disable="isGuestUser || (teamMemberLimit !== -1 && teamMembers.length >= teamMemberLimit)"
  :hint="isGuestUser ? 'Sign up to invite team members' : undefined"
>
  <template #prepend>
    <q-icon name="email" />
  </template>
</q-input>
```

#### 4. Updated Button Disable Logic
```vue
<q-btn
  color="primary"
  icon="add"
  label="Invite"
  @click="addTeamMember"
  :loading="checkingUser"
  :disable="isGuestUser || !newMemberEmail || (teamMemberLimit !== -1 && teamMembers.length >= teamMemberLimit)"
>
  <q-tooltip v-if="isGuestUser">
    Sign up for a free account to invite team members
  </q-tooltip>
</q-btn>
```

## User Experience Flow

### Before:
1. Guest user sees team member invitation section
2. Input field and button look similar to enabled state in light mode
3. No explanation why they can't invite members
4. User might try to enter email and click invite, only to be confused

### After:
1. Guest user sees prominent orange warning banner
2. Clear message: "Team invitations are not available for guest users"
3. Explanation: Need to sign up for free account
4. Call-to-action button: "Sign Up Free"
5. Input and button are visually disabled (gray, low opacity)
6. Hint text and tooltip provide additional context
7. Banner for plan limits is hidden for guests (only shown to real users)

## Visual Design

### Light Mode:
- **Warning Banner**: Orange background (`#ffe0b2`) with dark gray text
- **Disabled Input**: Light gray background (`#f5f5f5`), reduced opacity (0.6)
- **Disabled Button**: Gray background (`#e0e0e0`), gray text, reduced opacity (0.5)
- **Lock Icon**: Warning color for visual emphasis

### Dark Mode:
- Uses Quasar's default dark mode disabled states
- Warning banner adapts to dark theme automatically

## Testing

To test the changes:
1. Visit `/app/projects/create` as a guest user
2. Navigate to "Team Members" step
3. Verify the orange warning banner is displayed
4. Verify the email input and invite button are disabled
5. Hover over the invite button to see the tooltip
6. Click "Sign Up Free" to verify it navigates to registration

## Benefits

1. **Clear Communication**: Users immediately understand this is a paid/registered feature
2. **Better Visibility**: Disabled state is obvious in both light and dark modes
3. **Guided Action**: CTA button guides users to sign up if they want this feature
4. **Prevents Confusion**: No more trying to use a feature that won't work
5. **Professional UX**: Follows best practices for feature gating and upgrade prompts

## Related Files

- `/apps/web/src/pages/app/CreateProjectPage.vue` - Main changes
- `/apps/web/src/stores/auth.ts` - Guest user detection (`isGuest` property)

## Future Enhancements

Consider adding similar guest restrictions to:
- Project deletion (guests can only delete their own projects)
- Advanced project settings
- Integration with external tools
- Export/import features
