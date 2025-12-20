import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import { UserContextProvider } from '@/context/UserContext';
import EditorPageLayout from './EditorPageLayout'
import Editor from '../components/Editor';
import './printer.css'

const EditorPage = () => {

  return (
    <UserContextProvider>
      <EditorPageLayout>
        <div>
            <div id="editor" className='m-8 '>
                <Editor/>
            </div>
        </div>
      </EditorPageLayout>
    </UserContextProvider>
  )
}

export default EditorPage