import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  User 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function setupAdmin() {
  try {
    // Create admin user
    const adminEmail = 'tamvu2104@gmail.com';
    const adminPassword = 'admin123456'; // You should change this in production
    
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      adminEmail, 
      adminPassword
    );
    
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, {
      displayName: 'Admin User'
    });
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: adminEmail,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      profileImage: '',
      bio: 'System administrator'
    });
    
    console.log('Admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('UID:', user.uid);
    
    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating admin:', error);
    throw new Error(error.message);
  }
}

export async function createSampleMembers() {
  try {
    const sampleMembers = [
      {
        email: 'john.doe@example.com',
        password: 'password123',
        name: 'John Doe',
        role: 'member',
        bio: 'Sample member for testing'
      },
      {
        email: 'jane.smith@example.com',
        password: 'password123',
        name: 'Jane Smith',
        role: 'member',
        bio: 'Sample member for testing'
      },
      {
        email: 'mike.wilson@example.com',
        password: 'password123',
        name: 'Mike Wilson',
        role: 'member',
        bio: 'Sample member for testing'
      }
    ];
    
    const createdMembers = [];
    
    for (const member of sampleMembers) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          member.email,
          member.password
        );
        
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: member.name
        });
        
        await setDoc(doc(db, 'users', user.uid), {
          email: member.email,
          name: member.name,
          role: member.role,
          createdAt: new Date(),
          profileImage: '',
          bio: member.bio
        });
        
        createdMembers.push({ email: member.email, uid: user.uid });
        
        // Sign out after creating each user
        await auth.signOut();
      } catch (error: any) {
        console.error(`Error creating member ${member.email}:`, error);
      }
    }
    
    console.log('Sample members created:', createdMembers);
    return { success: true, members: createdMembers };
  } catch (error: any) {
    console.error('Error creating sample members:', error);
    throw new Error(error.message);
  }
}
